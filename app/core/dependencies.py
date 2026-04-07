from typing import List

from fastapi import Depends, HTTPException, status

from app.core.security import get_current_user
from app.modules.auth.models import User, UserRole


def require_roles(allowed_roles: List[UserRole]):
    """
    Dependency factory that requires user to have at least one of the specified roles.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = current_user.role_names
        # Check if any of user's roles matches the allowed roles
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


# Convenience dependencies
require_admin = require_roles([UserRole.ADMIN])
require_admin_or_gestor = require_roles([UserRole.ADMIN, UserRole.GESTOR])
require_any_role = require_roles([UserRole.ADMIN, UserRole.GESTOR, UserRole.COLABORADOR])


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin role."""
    if UserRole.ADMIN not in current_user.role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_manager_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin or gestor role."""
    user_roles = current_user.role_names
    if UserRole.ADMIN not in user_roles and UserRole.GESTOR not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager (Admin or Gestor) access required"
        )
    return current_user


async def get_content_creator(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin or gestor role (can create/edit content)."""
    user_roles = current_user.role_names
    if UserRole.ADMIN not in user_roles and UserRole.GESTOR not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Gestor access required"
        )
    return current_user
