import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.modules.onboarding.models import OnboardingItem
from app.modules.knowledge_base.models import SOP, AttendanceProtocol, HealthPlan, SOPStatus
from app.modules.auth.models import User, UserRole


@pytest.fixture
async def test_health_plan(db: AsyncSession):
    """Fixture to create a test health plan."""
    plan = HealthPlan(name="Test Plan", logo_path="/img/test.png")
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@pytest.fixture
async def test_sop(db: AsyncSession, admin_user: User):
    """Fixture to create a test SOP."""
    sop = SOP(
        title="Test SOP",
        category="General",
        status=SOPStatus.PUBLISHED,
        created_by_id=admin_user.id
    )
    db.add(sop)
    await db.commit()
    await db.refresh(sop)
    return sop


@pytest.fixture
async def test_protocol(db: AsyncSession, test_health_plan: HealthPlan):
    """Fixture to create a test Protocol."""
    protocol = AttendanceProtocol(
        title="Test Protocol",
        health_plan_id=test_health_plan.id,
        patient_type="externo"
    )
    db.add(protocol)
    await db.commit()
    await db.refresh(protocol)
    return protocol


@pytest.mark.asyncio
async def test_create_onboarding_item(
    async_client: AsyncClient, 
    admin_token_headers: dict, 
    test_sop: SOP
):
    """T2: Verify that an admin can create a new onboarding item."""
    payload = {
        "title": "Step 1: Introduction",
        "content": "This is the first step of the training.",
        "order_index": 1,
        "sector_slug": "general",
        "sop_id": test_sop.id
    }
    
    response = await async_client.post(
        "/playlists/items", 
        json=payload, 
        headers=admin_token_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["sop_id"] == test_sop.id
    assert data["order_index"] == 1


@pytest.mark.asyncio
async def test_list_onboarding_items(
    async_client: AsyncClient, 
    admin_token_headers: dict, 
    test_sop: SOP,
    db: AsyncSession
):
    """T1: Verify listing items for a specific SOP."""
    # Create some items manually
    item1 = OnboardingItem(title="Step 2", sop_id=test_sop.id, order_index=2)
    item2 = OnboardingItem(title="Step 1", sop_id=test_sop.id, order_index=1)
    db.add_all([item1, item2])
    await db.commit()
    
    response = await async_client.get(
        f"/playlists/items?sop_id={test_sop.id}", 
        headers=admin_token_headers
    )
    
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    # Verify order
    assert items[0]["title"] == "Step 1"
    assert items[1]["title"] == "Step 2"


@pytest.mark.asyncio
async def test_create_item_unauthorized(
    async_client: AsyncClient, 
    db: AsyncSession, 
    test_sop: SOP
):
    """T3: Verify that a regular user cannot create an item."""
    from app.core.security import get_password_hash
    from app.modules.auth.models import UserRoleLink
    # Create a regular collaborator
    user = User(
        email="user@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="Regular User"
    )
    db.add(user)
    await db.flush()
    db.add(UserRoleLink(user_id=user.id, role=UserRole.COLABORADOR))
    await db.commit()
    
    # Login as regular user
    login_res = await async_client.post(
        "/auth/login",
        data={"username": "user@test.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {"title": "Forbidden Step", "sop_id": test_sop.id}
    response = await async_client.post("/playlists/items", json=payload, headers=headers)
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_onboarding_item(
    async_client: AsyncClient, 
    admin_token_headers: dict, 
    test_sop: SOP,
    db: AsyncSession
):
    """T4: Verify partially updating an item."""
    item = OnboardingItem(title="Initial Title", sop_id=test_sop.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    payload = {"title": "Updated Title", "order_index": 5}
    response = await async_client.patch(
        f"/playlists/items/{item.id}", 
        json=payload, 
        headers=admin_token_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["order_index"] == 5


@pytest.mark.asyncio
async def test_delete_onboarding_item(
    async_client: AsyncClient, 
    admin_token_headers: dict, 
    db: AsyncSession,
    test_sop: SOP
):
    """Verify deleting an item."""
    item = OnboardingItem(title="To delete", sop_id=test_sop.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    response = await async_client.delete(
        f"/playlists/items/{item.id}", 
        headers=admin_token_headers
    )
    
    assert response.status_code == 204
    
    # Check it's gone
    res = await db.execute(select(OnboardingItem).where(OnboardingItem.id == item.id))
    assert res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_upload_item_asset(
    async_client: AsyncClient, 
    admin_token_headers: dict, 
    db: AsyncSession,
    test_sop: SOP
):
    """T5: Verify uploading an image for an item."""
    item = OnboardingItem(title="With Image", sop_id=test_sop.id, sector_slug="test-sector")
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    # Create a dummy image
    image_content = b"fake binary image data"
    files = {"file": ("test.png", io.BytesIO(image_content), "image/png")}
    
    response = await async_client.post(
        f"/playlists/items/{item.id}/upload-asset", 
        files=files, 
        headers=admin_token_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "image_path" in data
    assert "test-sector" in data["image_path"]
    assert data["image_path"].endswith(".png")
    
    # Clean up created file (optional in test environment but good practice)
    import os
    file_path = os.path.join("frontend", "public", data["image_path"].lstrip("/"))
    if os.path.exists(file_path):
        os.remove(file_path)
