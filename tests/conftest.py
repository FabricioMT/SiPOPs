import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.modules.auth.models import User
from app.main import app


# ---------------------------------------------------------------------------
# Test engine — in-memory SQLite with StaticPool so that every connection
# inside the *same* process shares the same underlying database.
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Override the FastAPI `get_db` dependency so the app writes to the test DB.
# ---------------------------------------------------------------------------
async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
async def _setup_and_teardown_db():
    """Drop & recreate all tables for every single test → full isolation."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def async_client():
    """Provide an httpx AsyncClient wired to the FastAPI ASGI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def db():
    """Provide a database session for setup/assertions within tests."""
    async with TestingSessionLocal() as session:
        yield session


@pytest.fixture
async def admin_user(db: AsyncSession):
    """Create a test admin user."""
    from app.modules.auth.models import User, UserRole
    from app.core.security import get_password_hash
    
    user = User(
        email="admin@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Admin Test"
    )
    db.add(user)
    await db.flush() # Generate ID
    
    from app.modules.auth.models import UserRoleLink
    db.add(UserRoleLink(user_id=user.id, role=UserRole.ADMIN))
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def admin_token_headers(async_client: AsyncClient, admin_user: User):
    """Provide authentication headers for the admin user."""
    response = await async_client.post(
        "/auth/login",
        data={"username": admin_user.email, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
