import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session_maker
from app.modules.knowledge_base.models import HealthPlan, SOP, SOPStatus
from app.modules.onboarding.models import Playlist, PlaylistSOP
from app.modules.auth.models import User, UserRole

async def seed_playlists():
    async with async_session_maker() as db:
        # Find an admin user to be the creator
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        admin = result.scalars().first()
        if not admin:
            print("No admin user found. Creating a generic playlist creator.")
            admin = User(email="admin@medicore.com", hashed_password="x", full_name="System", role=UserRole.ADMIN)
            db.add(admin)
            await db.flush()

        # Get all health plans
        plans_result = await db.execute(select(HealthPlan))
        health_plans = plans_result.scalars().all()

        for plan in health_plans:
            # check if a playlist for this plan already exists
            existing_pl = await db.execute(select(Playlist).where(Playlist.title == f"Trilha: {plan.name}"))
            if existing_pl.scalar_one_or_none():
                print(f"Playlist for {plan.name} already exists. Skipping.")
                continue
                
            # Create a playlist for each plan
            playlist = Playlist(
                title=f"Trilha: {plan.name}",
                description=f"Treinamento e procedimentos obrigatórios do convênio {plan.name}.",
                created_by_id=admin.id
            )
            db.add(playlist)
            await db.flush()
            
            # Fetch SOPs for this plan
            sops_result = await db.execute(
                select(SOP)
                .where(SOP.health_plan_id == plan.id)
                .where(SOP.status == SOPStatus.PUBLISHED)
            )
            sops = sops_result.scalars().all()
            
            for i, sop in enumerate(sops):
                p_sop = PlaylistSOP(
                    playlist_id=playlist.id,
                    sop_id=sop.id,
                    order_index=i + 1
                )
                db.add(p_sop)
                
            print(f"Created Playlist for {plan.name} with {len(sops)} SOPs.")

        await db.commit()
        print("Done seeding playlists!")

if __name__ == "__main__":
    asyncio.run(seed_playlists())
