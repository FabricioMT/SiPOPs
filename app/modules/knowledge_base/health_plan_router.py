from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.knowledge_base.models import HealthPlan, SOP, AttendanceProtocol, PatientType, ProtocolReading
from app.modules.knowledge_base.schemas import (
    HealthPlanResponse, SOPResponse, AttendanceProtocolResponse
)
from app.modules.knowledge_base import service
from datetime import datetime
from pydantic import BaseModel

class ProtocolReadingResponse(BaseModel):
    id: int
    protocol_id: int
    user_id: int
    acknowledged_at: datetime
    class Config:
        from_attributes = True

class ProtocolReadingStatus(BaseModel):
    protocol_id: int
    has_acknowledged: bool
    acknowledged_at: datetime | None = None

router = APIRouter(prefix="/health-plans", tags=["health-plans"])

def plan_to_response(plan: HealthPlan) -> HealthPlanResponse:
    """Convert HealthPlan model to response schema."""
    return HealthPlanResponse(
        id=plan.id,
        name=plan.name,
        logo_path=plan.logo_path,
        is_active=plan.is_active
    )

def sop_to_response(sop: SOP) -> SOPResponse:
    """Convert SOP model to response schema."""
    return SOPResponse(
        id=sop.id,
        title=sop.title,
        category=sop.category,
        status=sop.status,
        created_by_id=sop.created_by_id,
        health_plan_id=sop.health_plan_id,
        created_at=sop.created_at,
        updated_at=sop.updated_at,
        current_version_number=sop.current_version.version_number if sop.current_version else None
    )

@router.get("", response_model=List[HealthPlanResponse])
async def list_health_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all active health plans (Logos).
    """
    plans = await service.get_health_plans(db)
    return [plan_to_response(p) for p in plans]

@router.get("/{plan_id}", response_model=HealthPlanResponse)
async def get_health_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific health plan by ID.
    """
    plan = await service.get_health_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health plan not found"
        )
    return plan_to_response(plan)

@router.get("/{plan_id}/sops", response_model=List[SOPResponse])
async def list_plan_sops(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all published SOPs for a specific health plan.
    """
    sops = await service.get_health_plan_sops(db, plan_id)
    return [sop_to_response(s) for s in sops]


@router.get("/{plan_id}/protocols", response_model=List[AttendanceProtocolResponse])
async def list_plan_protocols(
    plan_id: int,
    patient_type: Optional[PatientType] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List attendance protocols for a specific health plan, optionally filtered by patient_type.
    """
    stmt = select(AttendanceProtocol).where(AttendanceProtocol.health_plan_id == plan_id)
    if patient_type:
        stmt = stmt.where(AttendanceProtocol.patient_type == patient_type)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/{plan_id}/protocols/{protocol_id}/acknowledge", response_model=ProtocolReadingResponse, status_code=status.HTTP_201_CREATED)
async def acknowledge_protocol(
    plan_id: int,
    protocol_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Confirmar leitura de um protocolo de plano de saúde (\"Li e Estou Ciente\").
    Idempotente: retorna o registro existente se já confirmado.
    """
    # Verify protocol belongs to this plan
    result = await db.execute(
        select(AttendanceProtocol)
        .where(AttendanceProtocol.id == protocol_id)
        .where(AttendanceProtocol.health_plan_id == plan_id)
    )
    protocol = result.scalar_one_or_none()
    if not protocol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Protocol not found")

    # Check if already acknowledged
    existing = await db.execute(
        select(ProtocolReading)
        .where(ProtocolReading.protocol_id == protocol_id)
        .where(ProtocolReading.user_id == current_user.id)
    )
    existing_reading = existing.scalar_one_or_none()
    if existing_reading:
        return existing_reading

    reading = ProtocolReading(protocol_id=protocol_id, user_id=current_user.id)
    db.add(reading)
    await db.commit()
    await db.refresh(reading)
    return reading


@router.get("/{plan_id}/protocols/{protocol_id}/reading-status", response_model=ProtocolReadingStatus)
async def get_protocol_reading_status(
    plan_id: int,
    protocol_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica se o usuário atual já confirmou a leitura deste protocolo.
    """
    existing = await db.execute(
        select(ProtocolReading)
        .where(ProtocolReading.protocol_id == protocol_id)
        .where(ProtocolReading.user_id == current_user.id)
    )
    reading = existing.scalar_one_or_none()
    return ProtocolReadingStatus(
        protocol_id=protocol_id,
        has_acknowledged=reading is not None,
        acknowledged_at=reading.acknowledged_at if reading else None
    )
