from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.core.dependencies import get_admin_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.schemas import (
    UserCreate, UserResponse, Token, ForgotPasswordRequest, ResetPasswordRequest, UserUpdate,
    UserProfileUpdate, UserPasswordUpdate, UserAdminCreate, UserAdminResponse
)
from app.modules.auth import service
from app.modules.auth.utils import create_password_reset_token, send_reset_password_email, verify_password_reset_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/users", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_user_admin(
    user_data: UserAdminCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user by an admin (Admin only).
    The system generates an automatic password and returns it in the response.
    """
    # Check if user already exists
    existing_user = await service.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user, plain_password = await service.create_user_admin(db, user_data)
    await db.commit()
    
    # Map to schema manually to include plain_password
    return UserAdminResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        plain_password=plain_password
    )




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


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    update_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update own profile information.
    """
    updated_user = await service.update_user_profile(db, current_user, update_data)
    await db.commit()
    return updated_user


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_my_password(
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update own password.
    """
    success = await service.update_user_password(db, current_user, password_data)
    if not success:
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    await db.commit()
    return None


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



@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[UserRole] = None,
    limit: int = 50,
    offset: int = 0,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users (Admin only).
    """
    return await service.get_users(db, role=role, limit=limit, offset=offset)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    update_data: UserUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user (Admin only).
    """
    updated_user = await service.update_user(db, user_id, update_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user (Admin only).
    """
    success = await service.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    await db.commit()
    return None
