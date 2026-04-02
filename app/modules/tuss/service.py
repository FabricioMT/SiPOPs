from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tuss.models import TUSSCode
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
