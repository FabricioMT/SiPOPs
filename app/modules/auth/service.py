from typing import Optional, List
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import secrets
import string
from app.core.security import get_password_hash, verify_password
from app.modules.auth.models import User, UserRole, UserRoleLink
from app.modules.auth.schemas import UserCreate, UserAdminCreate, UserUpdate, UserProfileUpdate, UserPasswordUpdate
from app.modules.auth.utils import verify_password_reset_token

async def create_user_admin(db: AsyncSession, user_data: UserAdminCreate) -> tuple[User, str]:
    """
    Create a new user by an admin with a generated password.
    """
    # Generate random password (8 chars)
    alphabet = string.ascii_letters + string.digits
    plain_password = ''.join(secrets.choice(alphabet) for _ in range(8))
    
    hashed_password = get_password_hash(plain_password)
    
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_active=True,
    )
    
    db.add(user)
    await db.flush()
    
    # Add roles
    for role_enum in user_data.roles:
        db.add(UserRoleLink(user_id=user.id, role=role_enum))
        
    await db.commit()
    await db.refresh(user)
    
    return user, plain_password


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email address with roles loaded."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get a user by ID with roles loaded."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """Create a new user with multiple roles."""
    hashed_password = get_password_hash(user_data.password)
    
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_active=user_data.is_active,
    )
    
    db.add(user)
    await db.flush()
    
    # Add roles
    for role_enum in user_data.roles:
        db.add(UserRoleLink(user_id=user.id, role=role_enum))
    
    await db.commit()
    await db.refresh(user)
    
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    """Authenticate a user and return user object if valid."""
    user = await get_user_by_email(db, email)
    
    if user is None or not verify_password(password, user.hashed_password):
        return None
    
    if not user.is_active:
        return None
    
    return user


async def get_users(
    db: AsyncSession, 
    role: Optional[UserRole] = None,
    limit: int = 50,
    offset: int = 0
) -> List[User]:
    """Get all users with optional role filtering (at least one role matches)."""
    stmt = select(User).options(selectinload(User.roles))
    
    if role:
        stmt = stmt.join(UserRoleLink).where(UserRoleLink.role == role)
    
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_user(db: AsyncSession, user_id: int, update_data: UserUpdate) -> Optional[User]:
    """Update user information, including its entire role list."""
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    
    if update_data.email and update_data.email != user.email:
        # Check if new email is already taken
        existing = await get_user_by_email(db, update_data.email)
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = update_data.email
        
    if update_data.full_name is not None:
        user.full_name = update_data.full_name
        
    if update_data.is_active is not None:
        user.is_active = update_data.is_active

    if update_data.roles is not None:
        # Reset roles: delete all and add new ones
        await db.execute(delete(UserRoleLink).where(UserRoleLink.user_id == user.id))
        for role_enum in update_data.roles:
            db.add(UserRoleLink(user_id=user.id, role=role_enum))
            
    if update_data.password:
        user.hashed_password = get_password_hash(update_data.password)
        
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_profile(db: AsyncSession, user: User, update_data: UserProfileUpdate) -> User:
    """Update own profile information."""
    if update_data.email and update_data.email != user.email:
        existing = await get_user_by_email(db, update_data.email)
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = update_data.email
        
    if update_data.full_name is not None:
        user.full_name = update_data.full_name
        
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_password(db: AsyncSession, user: User, password_data: UserPasswordUpdate) -> bool:
    """Update own password after verifying current one."""
    if not verify_password(password_data.current_password, user.hashed_password):
        return False
        
    user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()
    return True


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    """Delete a user account."""
    user = await get_user_by_id(db, user_id)
    if not user:
        return False
        
    await db.delete(user)
    await db.commit()
    return True


async def reset_user_password(db: AsyncSession, token: str, new_password: str) -> Optional[User]:
    """Reset a user's password using a valid reset token."""
    email = verify_password_reset_token(token)
    if not email:
        return None
        
    user = await get_user_by_email(db, email)
    if not user:
        return None
        
    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user
