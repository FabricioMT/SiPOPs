from datetime import datetime
from typing import Optional, List, Union, Any

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from app.modules.auth.models import UserRole


# ============== User Schemas ==============

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    roles: List[UserRole] = [UserRole.COLABORADOR]


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=6, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user data."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    roles: Optional[List[UserRole]] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

    @field_validator("roles", mode="before")
    @classmethod
    def transform_roles(cls, v):
        # If it's a list of UserRoleLink objects, extract the enums
        if isinstance(v, list) and len(v) > 0 and hasattr(v[0], 'role'):
            return [r.role for r in v]
        return v


class UserAdminCreate(UserBase):
    """Schema for admin to create a user (no password sent)."""
    pass


class UserAdminResponse(UserResponse):
    """Response containing the generated password for the admin."""
    plain_password: str


# ============== Auth Schemas ==============

class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: str
    exp: datetime


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting a password reset link."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for setting a new password via token."""
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)


class UserProfileUpdate(BaseModel):
    """Schema for updating own profile."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None


class UserPasswordUpdate(BaseModel):
    """Schema for updating own password."""
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)
