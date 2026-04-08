from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.modules.knowledge_base.schemas import SOPResponse, AttendanceProtocolResponse


# ============== Playlist Schemas ==============

class PlaylistBase(BaseModel):
    """Base playlist schema."""
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None


class PlaylistCreate(PlaylistBase):
    """Schema for creating a new playlist."""
    pass


class PlaylistUpdate(BaseModel):
    """Schema for updating a playlist."""
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None


class PlaylistSOPResponse(BaseModel):
    """Schema for SOP or Protocol association in a playlist response."""
    sop_id: Optional[int] = None
    protocol_id: Optional[int] = None
    order_index: int
    sop: Optional[SOPResponse] = None
    protocol: Optional[AttendanceProtocolResponse] = None
    
    class Config:
        from_attributes = True


class PlaylistResponse(PlaylistBase):
    """Basic playlist response."""
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PlaylistDetailResponse(PlaylistResponse):
    """Detailed playlist response including ordered SOPs."""
    sops: List[PlaylistSOPResponse]


# ============== Management Schemas ==============

class PlaylistSOPAdd(BaseModel):
    """Schema for adding an SOP or Protocol to a playlist."""
    sop_id: Optional[int] = None
    protocol_id: Optional[int] = None
    order_index: Optional[int] = None


# ============== Progress Schemas ==============

class ProgressResponse(BaseModel):
    """Schema for user progress in a playlist."""
    playlist_id: int
    playlist_title: str
    percentage: float
    read_count: int
    total_count: int


class ReadingSyncSchema(BaseModel):
    """Schema for syncing reading progress."""
    content_id: str  # e.g., "sop:1", "proto:5", "item:10"
    seconds: int
    final: bool = False


# ============== Onboarding Item Schemas ==============

class OnboardingItemBase(BaseModel):
    title: str
    content: Optional[str] = None
    order_index: int = 0
    sector_slug: str = "general"
    protocol_id: Optional[int] = None
    sop_id: Optional[int] = None


class OnboardingItemCreate(OnboardingItemBase):
    pass


class OnboardingItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order_index: Optional[int] = None
    sector_slug: Optional[str] = None
    protocol_id: Optional[int] = None
    sop_id: Optional[int] = None


class OnboardingItemRead(OnboardingItemBase):
    id: int
    image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
