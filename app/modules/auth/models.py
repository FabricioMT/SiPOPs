import enum
from datetime import datetime

from sqlalchemy import String, Boolean, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

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


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), 
        default=UserRole.COLABORADOR, 
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
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
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
