import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.knowledge_base.models import SOP, SOPStatus
from app.modules.onboarding.models import ContentReadingLog
from app.modules.auth.models import User

@pytest.fixture
async def test_sop(db: AsyncSession, admin_user: User):
    """Fixture to create a test SOP."""
    sop = SOP(
        title="Test SOP for Tracking",
        category="General",
        status=SOPStatus.PUBLISHED,
        created_by_id=admin_user.id,
        min_reading_seconds=30
    )
    db.add(sop)
    await db.commit()
    await db.refresh(sop)
    return sop

@pytest.mark.asyncio
async def test_sync_reading_atomic(
    async_client: AsyncClient, 
    admin_token_headers: dict, 
    test_sop: SOP,
    db: AsyncSession
):
    """Verify heartbeats correctly increment cumulative time."""
    content_id = f"sop:{test_sop.id}"
    
    # Sync 5 seconds
    payload = {"content_id": content_id, "seconds": 5, "final": False}
    response = await async_client.post("/playlists/sync-reading", json=payload, headers=admin_token_headers)
    assert response.status_code == 200
    assert response.json()["total_seconds"] == 5
    
    # Sync another 7 seconds
    payload["seconds"] = 7
    response = await async_client.post("/playlists/sync-reading", json=payload, headers=admin_token_headers)
    assert response.status_code == 200
    assert response.json()["total_seconds"] == 12
    
    # Verify in DB
    res = await db.execute(select(ContentReadingLog).where(ContentReadingLog.content_id == content_id))
    log = res.scalar_one()
    assert log.total_seconds == 12

@pytest.mark.asyncio
async def test_sync_reading_completion(
    async_client: AsyncClient, 
    admin_token_headers: dict, 
    test_sop: SOP,
    db: AsyncSession
):
    """Verify is_completed marks True after threshold."""
    content_id = f"sop:{test_sop.id}"
    
    # SOP has min_reading_seconds (default 30 if not specified in fixture, but we check models)
    # Let's ensure it's 10 for this test
    test_sop.min_reading_seconds = 10
    await db.commit()
    
    # Sync 9 seconds (not enough)
    payload = {"content_id": content_id, "seconds": 9, "final": False}
    response = await async_client.post("/playlists/sync-reading", json=payload, headers=admin_token_headers)
    assert response.json()["is_completed"] is False
    
    # Sync 2 more
    payload["seconds"] = 2
    response = await async_client.post("/playlists/sync-reading", json=payload, headers=admin_token_headers)
    assert response.json()["is_completed"] is True
    assert response.json()["total_seconds"] == 11

@pytest.mark.asyncio
async def test_sync_reading_query_auth(
    async_client: AsyncClient, 
    db: AsyncSession,
    test_sop: SOP
):
    """Verify token works via query param (essential for sendBeacon)."""
    # Create a user to get a token
    from app.core.security import create_access_token
    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one()
    token = create_access_token(subject=str(user.id))
    
    content_id = f"sop:{test_sop.id}"
    payload = {"content_id": content_id, "seconds": 5, "final": True}
    
    # POST without Auth header but with token_query param
    response = await async_client.post(
        f"/playlists/sync-reading?token_query={token}", 
        json=payload
    )
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
