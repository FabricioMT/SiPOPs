from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.auth.models import User
    from app.modules.knowledge_base.models import SOP, AttendanceProtocol


class Playlist(Base):
    """Playlist (Trilha) model for grouping SOPs in a logical order."""
    
    __tablename__ = "playlists"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Creator
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.current_timestamp(), 
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.current_timestamp(), 
        onupdate=func.current_timestamp(),
        nullable=False
    )
    
    # Relationships
    sops: Mapped[List["PlaylistSOP"]] = relationship(
        "PlaylistSOP", 
        back_populates="playlist",
        order_by="PlaylistSOP.order_index",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Playlist(id={self.id}, title={self.title})>"


class PlaylistSOP(Base):
    """Association model between Playlists and SOPs/Protocols with ordering."""
    
    __tablename__ = "playlist_sops"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    playlist_id: Mapped[int] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False)
    sop_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sops.id", ondelete="CASCADE"), nullable=True)
    protocol_id: Mapped[Optional[int]] = mapped_column(ForeignKey("attendance_protocols.id", ondelete="CASCADE"), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Relationships
    playlist: Mapped["Playlist"] = relationship("Playlist", back_populates="sops")
    sop: Mapped[Optional["SOP"]] = relationship("SOP")
    protocol: Mapped[Optional["AttendanceProtocol"]] = relationship("AttendanceProtocol")
    
    def __repr__(self) -> str:
        return f"<PlaylistSOP(playlist_id={self.playlist_id}, sop_id={self.sop_id}, protocol_id={self.protocol_id})>"


class OnboardingItem(Base):
    """Model for a specific step/item in a training track (POP)."""
    
    __tablename__ = "onboarding_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Markdown instructions
    image_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Parent links
    protocol_id: Mapped[Optional[int]] = mapped_column(ForeignKey("attendance_protocols.id"), nullable=True)
    sop_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sops.id"), nullable=True)
    
    # Category/Sector link (to organize uploads)
    sector_slug: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp(), onupdate=func.current_timestamp())


class UserOnboardingProgress(Base):
    """Tracks per-item completion for a user."""
    
    __tablename__ = "user_onboarding_progress"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("onboarding_items.id"), nullable=False, index=True)
    
    completed: Mapped[bool] = mapped_column(default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User")
    item: Mapped["OnboardingItem"] = relationship("OnboardingItem")


class ContentReadingLog(Base):
    """
    Detailed audit log for study time tracking (Read-Time Tracking).
    Stores cumulative progress and completion status.
    """
    __tablename__ = "content_reading_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # content_id follows format like "sop:1", "proto:5", "item:10"
    content_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    total_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    # Timestamps
    last_sync: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )

    # Relationships
    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<ContentReadingLog(user_id={self.user_id}, content_id={self.content_id}, seconds={self.total_seconds})>"
