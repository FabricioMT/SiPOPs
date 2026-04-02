from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tuss.models import TUSSCode, TUSSUsage
from typing import List, Optional

async def get_tuss_codes(
    db: AsyncSession, 
    q: Optional[str] = None, 
    limit: int = 50, 
    offset: int = 0
) -> List[TUSSCode]:
    stmt = select(TUSSCode)
    if q:
        stmt = stmt.where(
            or_(
                TUSSCode.code.ilike(f"%{q}%"),
                TUSSCode.description.ilike(f"%{q}%")
            )
        )
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def track_tuss_usage(db: AsyncSession, user_id: int, tuss_id: int):
    """Increment use count for a TUSS code by a specific user."""
    stmt = select(TUSSUsage).where(
        and_(
            TUSSUsage.user_id == user_id,
            TUSSUsage.tuss_code_id == tuss_id
        )
    )
    result = await db.execute(stmt)
    usage = result.scalar_one_or_none()
    
    if usage:
        usage.usage_count += 1
    else:
        usage = TUSSUsage(user_id=user_id, tuss_code_id=tuss_id, usage_count=1)
        db.add(usage)
    
    await db.flush()
    return usage


async def get_recurrent_tuss(db: AsyncSession, user_id: int) -> List[TUSSCode]:
    """Get TUSS codes used 3 or more times by the user."""
    stmt = (
        select(TUSSCode)
        .join(TUSSUsage, TUSSCode.id == TUSSUsage.tuss_code_id)
        .where(
            and_(
                TUSSUsage.user_id == user_id,
                TUSSUsage.usage_count >= 3
            )
        )
        .order_by(TUSSUsage.usage_count.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
