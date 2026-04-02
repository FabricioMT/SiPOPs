import asyncio
import os
import sys

# Add the project root to sys.path to import app modules
sys.path.append(os.getcwd())

from app.core.database import async_session_maker
from app.modules.auth.models import User, UserRole
from sqlalchemy import select

async def update_to_admin():
    email = "admin@admin.com"
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {email} found. Current role: {user.role}")
            user.role = UserRole.ADMIN
            await db.commit()
            print(f"User {email} updated to {UserRole.ADMIN} role successfully.")
        else:
            print(f"User {email} not found. No changes made.")

if __name__ == "__main__":
    asyncio.run(update_to_admin())
