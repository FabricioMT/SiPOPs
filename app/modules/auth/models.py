import enum
from datetime import datetime
from typing import List

from sqlalchemy import String, Boolean, Enum, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enum for RBAC."""
    ADMIN = "admin"
    GESTOR = "gestor"
    COLABORADOR = "colaborador"
    # Sector-specific roles
    SEC_UE_SUS = "sec_ue_sus"          # Secretaria Urgência e Emergência SUS
    SEC_PA = "sec_pa"                  # Secretaria Pronto Atendimento
    SEC_PORTARIA = "sec_portaria"      # Secretaria Portaria Principal
    SEC_GUIAS = "sec_guias"            # Secretaria Central de Guias


class UserRoleLink(Base):
    """Join table for User <-> Roles relationship."""
    
    __tablename__ = "user_roles"
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), primary_key=True)


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Relationships
    roles: Mapped[List[UserRoleLink]] = relationship(
        "UserRoleLink", 
        cascade="all, delete-orphan",
        lazy="selectin" 
    )
    
    @property
    def role_names(self) -> List[UserRole]:
        """Convenience property to get a list of roles as enums."""
        return [r.role for r in self.roles]

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
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, roles={self.role_names})>"
