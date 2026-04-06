from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.tuss import service, schemas

router = APIRouter(prefix="/tuss", tags=["tuss"])

@router.get("", response_model=List[schemas.TUSSCodeRead])
async def list_tuss_codes(
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List TUSS codes with search functionality.
    """
    return await service.get_tuss_codes(db, q=q, limit=limit, offset=offset)


@router.post("/{tuss_id}/track", status_code=204)
async def track_tuss_usage(
    tuss_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Track that a user copied a TUSS code.
    """
    await service.track_tuss_usage(db, current_user.id, tuss_id)
    await db.commit()
    return None


@router.get("/recurrent", response_model=List[schemas.TUSSCodeRead])
async def list_recurrent_tuss(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List TUSS codes used 3 or more times by the current user.
    """
    return await service.get_recurrent_tuss(db, current_user.id)
