from typing import Optional, List

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.auth.models import User
from app.modules.knowledge_base.models import SOPVersion, SOPReading, SOP, AttendanceProtocol, ProtocolReading
from app.modules.onboarding.models import Playlist, PlaylistSOP
from app.modules.onboarding.schemas import PlaylistCreate, PlaylistUpdate


async def create_playlist(db: AsyncSession, playlist_data: PlaylistCreate, user: User) -> Playlist:
    """Create a new playlist."""
    playlist = Playlist(
        title=playlist_data.title,
        description=playlist_data.description,
        created_by_id=user.id,
    )
    db.add(playlist)
    await db.flush()
    await db.refresh(playlist)
    return playlist


async def get_playlist_by_id(db: AsyncSession, playlist_id: int) -> Optional[Playlist]:
    """Get playlist by ID with SOPs and Protocols loaded."""
    result = await db.execute(
        select(Playlist)
        .options(
            selectinload(Playlist.sops).selectinload(PlaylistSOP.sop).selectinload(SOP.versions),
            selectinload(Playlist.sops).selectinload(PlaylistSOP.protocol)
        )
        .where(Playlist.id == playlist_id)
    )
    return result.scalar_one_or_none()


async def get_playlists(
    db: AsyncSession, 
    limit: int = 20,
    offset: int = 0
) -> List[Playlist]:
    """Get list of playlists."""
    result = await db.execute(
        select(Playlist)
        .order_by(Playlist.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def update_playlist(
    db: AsyncSession, 
    playlist: Playlist, 
    update_data: PlaylistUpdate
) -> Playlist:
    """Update playlist properties."""
    if update_data.title is not None:
        playlist.title = update_data.title
    if update_data.description is not None:
        playlist.description = update_data.description
        
    await db.flush()
    return playlist


async def add_sop_to_playlist(
    db: AsyncSession, 
    playlist_id: int, 
    sop_id: Optional[int] = None, 
    protocol_id: Optional[int] = None,
    order_index: Optional[int] = None
) -> PlaylistSOP:
    """Add an SOP or Protocol to a playlist."""
    # If order_index is not provided, put it at the end
    if order_index is None:
        max_order = await db.execute(
            select(func.max(PlaylistSOP.order_index))
            .where(PlaylistSOP.playlist_id == playlist_id)
        )
        current_max = max_order.scalar() or 0
        order_index = current_max + 1
        
    playlist_sop = PlaylistSOP(
        playlist_id=playlist_id,
        sop_id=sop_id,
        protocol_id=protocol_id,
        order_index=order_index
    )
    db.add(playlist_sop)
    await db.flush()
    return playlist_sop


async def remove_sop_from_playlist(
    db: AsyncSession, 
    playlist_id: int, 
    sop_id: int
) -> bool:
    """Remove an SOP from a playlist."""
    result = await db.execute(
        delete(PlaylistSOP)
        .where(PlaylistSOP.playlist_id == playlist_id)
        .where(PlaylistSOP.sop_id == sop_id)
    )
    return result.rowcount > 0


async def calculate_progress(
    db: AsyncSession, 
    user_id: int, 
    playlist_id: int
) -> dict:
    """
    Calculate user progress in a playlist.
    
    Progress is based on:
    - SOPs: if the user has read the CURRENT version.
    - Protocols: if the user has acknowledged the protocol.
    """
    playlist = await get_playlist_by_id(db, playlist_id)
    if not playlist:
        return {"percentage": 0, "read_count": 0, "total_count": 0, "title": ""}
    
    total_count = len(playlist.sops)
    if total_count == 0:
        return {"percentage": 100, "read_count": 0, "total_count": 0, "title": playlist.title}
    
    read_count = 0
    for ps in playlist.sops:
        # Case 1: SOP
        if ps.sop_id:
            sop = ps.sop
            current_version = sop.current_version
            if not current_version:
                continue
                
            reading_exists = await db.execute(
                select(SOPReading)
                .where(SOPReading.sop_version_id == current_version.id)
                .where(SOPReading.user_id == user_id)
            )
            if reading_exists.scalar_one_or_none():
                read_count += 1
        
        # Case 2: Protocol
        elif ps.protocol_id:
            reading_exists = await db.execute(
                select(ProtocolReading)
                .where(ProtocolReading.protocol_id == ps.protocol_id)
                .where(ProtocolReading.user_id == user_id)
            )
            if reading_exists.scalar_one_or_none():
                read_count += 1
            
    percentage = (read_count / total_count) * 100
    return {
        "percentage": round(percentage, 2),
        "read_count": read_count,
        "total_count": total_count,
        "title": playlist.title
    }


async def get_all_playlists_progress(db: AsyncSession, user_id: int) -> List[dict]:
    """Calculate progress for all playlists for a specific user."""
    result = await db.execute(select(Playlist))
    playlists = result.scalars().all()
    
    progress_list = []
    for playlist in playlists:
        progress = await calculate_progress(db, user_id, playlist.id)
        progress["playlist_id"] = playlist.id
        progress_list.append(progress)
        
    return progress_list



async def complete_onboarding_item(db: AsyncSession, user_id: int, item_id: int):
    # Verifica se já existe progresso
    result = await db.execute(
        select(UserOnboardingProgress).where(
            UserOnboardingProgress.user_id == user_id,
            UserOnboardingProgress.item_id == item_id
        )
    )
    progress = result.scalars().first()

    if not progress:
        progress = UserOnboardingProgress(
            user_id=user_id,
            item_id=item_id,
            completed=True,
            completed_at=datetime.utcnow()
        )
        db.add(progress)
    else:
        progress.completed = True
        progress.completed_at = datetime.utcnow()
    
    await db.commit()
    return progress
