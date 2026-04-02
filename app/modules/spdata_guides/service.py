from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.spdata_guides.models import SPDATAGuide, SectorType, PatientType
from typing import List, Optional


async def get_guides(
    db: AsyncSession,
    sector: Optional[SectorType] = None,
    patient_type: Optional[PatientType] = None
) -> List[SPDATAGuide]:
    stmt = select(SPDATAGuide)
    if sector:
        stmt = stmt.where(SPDATAGuide.sector == sector)
    if patient_type:
        stmt = stmt.where(SPDATAGuide.patient_type == patient_type)
    stmt = stmt.order_by(SPDATAGuide.order_index)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_guide(db: AsyncSession, data: dict) -> SPDATAGuide:
    guide = SPDATAGuide(**data)
    db.add(guide)
    await db.flush()
    await db.refresh(guide)
async def get_guide(db: AsyncSession, guide_id: int) -> Optional[SPDATAGuide]:
    return await db.get(SPDATAGuide, guide_id)


async def update_guide(db: AsyncSession, guide_id: int, data: dict) -> Optional[SPDATAGuide]:
    guide = await get_guide(db, guide_id)
    if not guide:
        return None
    
    for key, value in data.items():
        if value is not None:
            setattr(guide, key, value)
    
    await db.flush()
    await db.refresh(guide)
    return guide
