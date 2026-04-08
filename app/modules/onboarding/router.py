from typing import List, Optional
import os
import shutil
import time
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.dependencies import get_content_creator, get_admin_user, require_admin_or_gestor
from app.modules.auth.models import User
from app.modules.onboarding.schemas import (
    PlaylistCreate, PlaylistUpdate, PlaylistResponse, 
    PlaylistDetailResponse, PlaylistSOPAdd, ProgressResponse
)
from app.modules.onboarding import service, schemas
from app.modules.onboarding.models import OnboardingItem


router = APIRouter(prefix="/playlists", tags=["onboarding"])


# ─── STATIC ROUTES (Fixed Paths) ───
# These MUST come before any routes with path parameters (like /{playlist_id})

@router.get("/items", response_model=List[schemas.OnboardingItemRead])
async def list_onboarding_items(
    protocol_id: Optional[int] = Query(None),
    sop_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List items for a protocol or SOP."""
    if not protocol_id and not sop_id:
        raise HTTPException(status_code=400, detail="Either protocol_id or sop_id must be provided")
    
    query = select(OnboardingItem).where(
        (OnboardingItem.protocol_id == protocol_id) if protocol_id else (OnboardingItem.sop_id == sop_id)
    )
    query = query.order_by(OnboardingItem.order_index.asc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/items", response_model=schemas.OnboardingItemRead, status_code=status.HTTP_201_CREATED)


@router.post("/sync-reading")
async def sync_reading(
    data: schemas.ReadingSyncSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync study time for a specific content (SOP or Protocol).
    Increments total_seconds and marks as completed if threshold is met.
    """
    from app.modules.onboarding.models import ContentReadingLog
    from app.modules.knowledge_base.models import SOP, AttendanceProtocol
    
    # Check if log already exists
    result = await db.execute(
        select(ContentReadingLog).where(
            ContentReadingLog.user_id == current_user.id,
            ContentReadingLog.content_id == data.content_id
        )
    )
    log = result.scalar_one_or_none()
    
    if not log:
        log = ContentReadingLog(
            user_id=current_user.id,
            content_id=data.content_id,
            total_seconds=data.seconds
        )
        db.add(log)
    else:
        # Atomic increment
        log.total_seconds += data.seconds
    
    # Fetch min_reading_time to check completion
    min_seconds = 30 # Default
    try:
        type_prefix, id_str = data.content_id.split(":")
        content_id_int = int(id_str)
        
        if type_prefix == "sop":
            res = await db.execute(select(SOP.min_reading_seconds).where(SOP.id == content_id_int))
            min_seconds = res.scalar() or 30
        elif type_prefix == "proto":
            res = await db.execute(select(AttendanceProtocol.min_reading_seconds).where(AttendanceProtocol.id == content_id_int))
            min_seconds = res.scalar() or 30
    except Exception:
        pass # Fallback to default 30s
    
    if log.total_seconds >= min_seconds:
        log.is_completed = True
        
    await db.commit()
    return {
        "status": "success", 
        "total_seconds": log.total_seconds, 
        "is_completed": log.is_completed,
        "min_seconds": min_seconds
    }
async def create_onboarding_item(
    item_data: schemas.OnboardingItemCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_or_gestor)
):
    """Create a new onboarding step (Admin/Gestor only)."""
    new_item = OnboardingItem(**item_data.model_dump())
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item


@router.get("/me/progress", response_model=List[ProgressResponse])
async def get_my_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get progress for all playlists for the current authenticated user."""
    progress_data = await service.get_all_playlists_progress(db, current_user.id)
    return [
        ProgressResponse(
            playlist_id=p["playlist_id"],
            playlist_title=p["title"],
            percentage=p["percentage"],
            read_count=p["read_count"],
            total_count=p["total_count"]
        ) for p in progress_data
    ]


@router.get("/users/{user_id}/progress", response_model=List[ProgressResponse])
async def get_user_all_progress(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin/Gestor only: view any user's progress."""
    progress_data = await service.get_all_playlists_progress(db, user_id)
    return [
        ProgressResponse(
            playlist_id=p["playlist_id"],
            playlist_title=p["title"],
            percentage=p["percentage"],
            read_count=p["read_count"],
            total_count=p["total_count"]
        ) for p in progress_data
    ]


# ─── PARAMETERIZED ROUTES (Dynamic Paths) ───

@router.post("", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: User = Depends(get_content_creator),
    db: AsyncSession = Depends(get_db)
):
    """Create a new playlist."""
    playlist = await service.create_playlist(db, playlist_data, current_user)
    return playlist


@router.get("", response_model=List[PlaylistResponse])
async def list_playlists(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all playlists."""
    playlists = await service.get_playlists(db, limit=limit, offset=offset)
    return playlists


@router.get("/{playlist_id}", response_model=PlaylistDetailResponse)
async def get_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get playlist details including its SOPs."""
    playlist = await service.get_playlist_by_id(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist


@router.put("/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: int,
    update_data: PlaylistUpdate,
    current_user: User = Depends(get_content_creator),
    db: AsyncSession = Depends(get_db)
):
    """Update a playlist."""
    playlist = await service.get_playlist_by_id(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    updated = await service.update_playlist(db, playlist, update_data)
    return updated


@router.post("/{playlist_id}/sops", status_code=status.HTTP_201_CREATED)
async def add_sop_to_playlist(
    playlist_id: int,
    data: PlaylistSOPAdd,
    current_user: User = Depends(get_content_creator),
    db: AsyncSession = Depends(get_db)
):
    """Add an SOP to a playlist."""
    playlist = await service.get_playlist_by_id(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    await service.add_sop_to_playlist(db, playlist_id, data.sop_id, data.order_index)
    return {"status": "success", "message": "SOP added to playlist"}


@router.delete("/{playlist_id}/sops/{sop_id}")
async def remove_sop_from_playlist(
    playlist_id: int,
    sop_id: int,
    current_user: User = Depends(get_content_creator),
    db: AsyncSession = Depends(get_db)
):
    """Remove an SOP from a playlist."""
    success = await service.remove_sop_from_playlist(db, playlist_id, sop_id)
    if not success:
        raise HTTPException(status_code=404, detail="Association not found")
    return {"status": "success", "message": "SOP removed from playlist"}


@router.get("/{playlist_id}/progress", response_model=ProgressResponse)
async def get_playlist_progress(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Calculate progress for the current user in a playlist."""
    progress = await service.calculate_progress(db, current_user.id, playlist_id)
    return ProgressResponse(
        playlist_id=playlist_id,
        playlist_title=progress["title"],
        percentage=progress["percentage"],
        read_count=progress["read_count"],
        total_count=progress["total_count"]
    )


# ─── Item-Specific Operations ───

@router.patch("/items/{item_id}", response_model=schemas.OnboardingItemRead)
async def update_onboarding_item(
    item_id: int,
    item_data: schemas.OnboardingItemUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_or_gestor)
):
    """Update an onboarding step."""
    result = await db.execute(select(OnboardingItem).where(OnboardingItem.id == item_id))
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_onboarding_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_or_gestor)
):
    """Delete an onboarding step."""
    result = await db.execute(select(OnboardingItem).where(OnboardingItem.id == item_id))
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.delete(item)
    await db.commit()
    return None


@router.post("/items/{item_id}/upload-asset", response_model=schemas.OnboardingItemRead)
async def upload_item_asset(
    item_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin_or_gestor)
):
    """Upload an image asset for a specific onboarding item."""
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG are allowed.")
    
    result = await db.execute(select(OnboardingItem).where(OnboardingItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    sector_slug = item.sector_slug or "general"
    upload_dir = os.path.join("frontend", "public", "img", "guides", sector_slug)
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = ".jpg" if file.content_type == "image/jpeg" else ".png"
    filename = f"step-{item_id}-{int(time.time())}{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    item.image_path = f"/img/guides/{sector_slug}/{filename}"
    await db.commit()
    await db.refresh(item)
    return item
