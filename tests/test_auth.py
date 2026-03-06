import pytest
from httpx import AsyncClient

# --- Register Tests ---

@pytest.mark.asyncio
async def test_register_success(async_client: AsyncClient):
    response = await async_client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "securepassword",
            "full_name": "Test User",
            "role": "colaborador"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(async_client: AsyncClient):
    # First registration should succeed (handled by the previous test if they run in order, 
    # but we do it again to ensure isolation or assume db_setup clears it)
    await async_client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "securepassword",
            "full_name": "First User",
            "role": "colaborador"
        }
    )
    
    # Second registration with same email should fail
    response = await async_client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "anotherpassword",
            "full_name": "Second User",
            "role": "colaborador"
        }
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


# --- Login Tests ---

@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient):
    # Create user first
    await async_client.post(
        "/auth/register",
        json={
            "email": "login@example.com",
            "password": "mypassword123",
            "full_name": "Login User",
            "role": "colaborador"
        }
    )
    
    # Attempt login
    response = await async_client.post(
        "/auth/login",
        data={
            "username": "login@example.com",
            "password": "mypassword123"
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client: AsyncClient):
    response = await async_client.post(
        "/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


# --- Password Recovery Tests ---

@pytest.mark.asyncio
async def test_forgot_password(async_client: AsyncClient):
    # Should always return 200 to prevent email enumeration
    response = await async_client.post(
        "/auth/forgot-password",
        json={"email": "anyone@example.com"}
    )
    assert response.status_code == 200
    assert "If the email is registered" in response.json()["msg"]


@pytest.mark.asyncio
async def test_reset_password_invalid_token(async_client: AsyncClient):
    response = await async_client.post(
        "/auth/reset-password",
        json={
            "token": "invalid.token.here",
            "new_password": "newsecurepassword"
        }
    )
    assert response.status_code == 400
    assert "Invalid or expired reset token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_full_password_recovery_flow(async_client: AsyncClient):
    # 1. Register a user
    await async_client.post(
        "/auth/register",
        json={
            "email": "recover@example.com",
            "password": "oldpassword",
            "full_name": "Recover User",
            "role": "colaborador"
        }
    )
    
    # We can't easily intercept the printed mock email in the test without mocking stdout,
    # so let's import the utility directly to generate a valid token for our test user
    from app.modules.auth.utils import create_password_reset_token
    token = create_password_reset_token(email="recover@example.com")
    
    # 3. Reset password using the token
    reset_response = await async_client.post(
        "/auth/reset-password",
        json={
            "token": token,
            "new_password": "newpassword123"
        }
    )
    assert reset_response.status_code == 200
    
    # 4. Verify login with NEW password succeeds
    login_new = await async_client.post(
        "/auth/login",
        data={
            "username": "recover@example.com",
            "password": "newpassword123"
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert login_new.status_code == 200
    
    # 5. Verify login with OLD password fails
    login_old = await async_client.post(
        "/auth/login",
        data={
            "username": "recover@example.com",
            "password": "oldpassword"
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert login_old.status_code == 401
