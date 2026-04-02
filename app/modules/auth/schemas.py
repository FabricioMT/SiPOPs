from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.modules.auth.models import UserRole


# ============== User Schemas ==============

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.COLABORADOR


class UserUpdate(BaseModel):
    """Schema for updating user data."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserAdminCreate(UserBase):
    """Schema for admin to create a user (no password sent)."""
    role: UserRole = UserRole.COLABORADOR


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
