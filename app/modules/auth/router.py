from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    UserCreate, UserResponse, Token, ForgotPasswordRequest, ResetPasswordRequest
)
from app.modules.auth import service
from app.modules.auth.utils import create_password_reset_token, send_reset_password_email



router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user.
    
    - **email**: Valid email address (unique)
    - **password**: Password with at least 6 characters
    - **full_name**: User's full name
    - **role**: User role (admin, gestor, colaborador)
    """
    # Check if user already exists
    existing_user = await service.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = await service.create_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Login and get JWT access token.
    
    - **username**: User's email address
    - **password**: User's password
    """
    user = await service.authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    
    Requires a valid JWT token in the Authorization header.
    """
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request a password reset token to be sent via email.
    """
    user = await service.get_user_by_email(db, request.email)
    if not user:
        # To prevent email enumeration, we return 200 even if the user is not found.
        return {"msg": "If the email is registered, a password reset link will be sent."}
    
    # Generate token and simulate email sending
    token = create_password_reset_token(email=user.email)
    send_reset_password_email(email=user.email, token=token)
    
    return {"msg": "If the email is registered, a password reset link will be sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password using the token sent via email.
    """
    updated_user = await service.reset_user_password(db, request.token, request.new_password)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )
    
    return {"msg": "Password updated successfully."}
