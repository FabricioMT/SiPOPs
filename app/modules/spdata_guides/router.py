from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.spdata_guides import service, schemas
from app.modules.spdata_guides.models import SectorType, PatientType

router = APIRouter(prefix="/spdata-guides", tags=["spdata-guides"])


from app.core.dependencies import require_admin_or_gestor
from app.modules.auth.models import UserRole

@router.get("/", response_model=List[schemas.SPDATAGuideRead])
async def list_guides(
    sector: Optional[SectorType] = None,
    patient_type: Optional[PatientType] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List SPDATA guides, optionally filtered by sector and patient type. (RBAC applied)"""
    
    # RBAC Logic
    if current_user.role not in [UserRole.ADMIN, UserRole.GESTOR]:
        # Map user role to SectorType
        role_sector_map = {
            UserRole.SEC_UE_SUS: SectorType.UE_SUS,
            UserRole.SEC_PA: SectorType.PA,
            UserRole.SEC_PORTARIA: SectorType.PORTARIA
        }
        user_sector = role_sector_map.get(current_user.role)
        
        if not user_sector:
            return [] # Unrecognized role sees nothing
            
        # If user is restricted to a sector, enforce it
        sector = user_sector

    return await service.get_guides(db, sector=sector, patient_type=patient_type)


@router.patch("/{guide_id}", response_model=schemas.SPDATAGuideRead)
async def update_guide(
    guide_id: int,
    update_data: schemas.SPDATAGuideUpdate,
    admin_user=Depends(require_admin_or_gestor),
    db: AsyncSession = Depends(get_db)
):
    """Update a specific guide (Admin/Gestor only)."""
    updated = await service.update_guide(db, guide_id, update_data.model_dump(exclude_unset=True))
    from fastapi import HTTPException
    if not updated:
        raise HTTPException(status_code=404, detail="Guide not found")
    await db.commit()
    return updated
