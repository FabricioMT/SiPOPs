import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User, UserRole
from app.modules.knowledge_base.models import HealthPlan, SOP, SOPStatus, SOPVersion
from app.modules.knowledge_base.schemas import HealthPlanCreate

@pytest.mark.asyncio
async def test_list_health_plans(async_client: AsyncClient, db: AsyncSession, admin_token_headers):
    # Create some health plans
    plan1 = HealthPlan(name="Plan A", logo_path="/img/a.png", is_active=True)
    plan2 = HealthPlan(name="Plan B", logo_path="/img/b.png", is_active=True)
    plan_inactive = HealthPlan(name="Plan C", is_active=False)
    
    db.add_all([plan1, plan2, plan_inactive])
    await db.commit()
    
    response = await async_client.get("/health-plans/", headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2  # Only active ones
    assert data[0]["name"] == "Plan A"
    assert data[1]["name"] == "Plan B"

@pytest.mark.asyncio
async def test_get_health_plan(async_client: AsyncClient, db: AsyncSession, admin_token_headers):
    plan = HealthPlan(name="Unimed", logo_path="/img/unimed.png")
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    
    response = await async_client.get(f"/health-plans/{plan.id}", headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Unimed"
    assert data["id"] == plan.id

@pytest.mark.asyncio
async def test_get_health_plan_not_found(async_client: AsyncClient, admin_token_headers):
    response = await async_client.get("/health-plans/999", headers=admin_token_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_list_plan_sops(async_client: AsyncClient, db: AsyncSession, admin_user: User, admin_token_headers):
    # Setup: Health Plan
    plan = HealthPlan(name="Cassi")
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    
    # Setup: SOPs
    sop1 = SOP(
        title="SOP for Cassi", 
        category="Test", 
        status=SOPStatus.PUBLISHED, 
        health_plan_id=plan.id,
        created_by_id=admin_user.id
    )
    sop_other = SOP(
        title="Other SOP", 
        category="Test", 
        status=SOPStatus.PUBLISHED, 
        created_by_id=admin_user.id
    )
    db.add_all([sop1, sop_other])
    await db.commit()
    await db.refresh(sop1)
    
    # Setup: Version for sop1
    version = SOPVersion(
        sop_id=sop1.id,
        version_number=1,
        content="Test content",
        created_by_id=admin_user.id
    )
    db.add(version)
    await db.commit()
    
    # Test
    response = await async_client.get(f"/health-plans/{plan.id}/sops", headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "SOP for Cassi"
    assert data[0]["health_plan_id"] == plan.id
