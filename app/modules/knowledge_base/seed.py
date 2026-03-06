import asyncio
import sys
import os

# Adiciona o diretório raiz ao path para permitir imports do app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from sqlalchemy import select
from app.core.database import async_session_maker, Base, engine
from app.core.security import get_password_hash
from app.modules.auth.models import User, UserRole
from app.modules.knowledge_base.models import HealthPlan, SOP, SOPVersion, SOPStatus
from app.modules.knowledge_base.schemas import SOPCreate

async def seed_data():
    print("Iniciando semeadura de dados (Seed)...")
    async with async_session_maker() as db:
        # 1. Garantir que existe um usuário Admin/Gestor
        result = await db.execute(select(User).where(User.email == "admin@medicore.com"))
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("Criando usuário admin...")
            admin = User(
                email="admin@medicore.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrador do Sistema",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            await db.flush()
        
        # 2. Criar Planos de Saúde
        plans_data = [
            {"name": "UNIMED", "logo_path": "/img/unimed.png"},
            {"name": "POSTAL SAUDE", "logo_path": "/img/postal_saude.png"},
            {"name": "CASSI", "logo_path": "/img/cassi.png"},
            {"name": "AMIL", "logo_path": "/img/amil.png"},
            {"name": "IPSEMG", "logo_path": "/img/ipsemg.png"},
            {"name": "IPSM", "logo_path": "/img/ipsm.png"},
            {"name": "PARTICULAR PP", "logo_path": "/img/particular_pp.png"},
            {"name": "PARTICULAR TOTAL", "logo_path": "/img/particular_total.png"},
        ]
        
        created_plans = {}
        for plan_info in plans_data:
            result = await db.execute(select(HealthPlan).where(HealthPlan.name == plan_info["name"]))
            plan = result.scalar_one_or_none()
            if not plan:
                print(f"Criando plano: {plan_info['name']}...")
                plan = HealthPlan(name=plan_info["name"], logo_path=plan_info["logo_path"])
                db.add(plan)
                await db.flush()
            created_plans[plan_info["name"]] = plan
        
        # 3. Criar POPs específicos para cada plano
        sops_to_create = [
            {
                "plan": "UNIMED",
                "title": "Protocolo Unimed: Autorização e Guia TISS",
                "content": """
                <h3>Requisitos de Autorização Unimed</h3>
                <ul>
                    <li>A Guia TISS deve ser obrigatoriamente assinada e carimbada pelo médico e pelo secretário.</li>
                    <li>O paciente ou representante legal deve assinar a guia no campo indicado.</li>
                    <li>Para exames de alto custo ou internações, a autorização deve ser realizada via site oficial: <a href="https://unimed.com.br/autorizador">Unimed Autorizador</a>.</li>
                </ul>
                """,
                "category": "Faturamento"
            },
            {
                "plan": "IPSEMG",
                "title": "Protocolo IPSEMG: Assinaturas e Códigos",
                "content": """
                <h3>Regras Críticas para IPSEMG</h3>
                <p><strong>Assinaturas:</strong> Todas as guias e laudos devem ser assinados POR EXTENSO (Ex: João da Silva Sauro). Rubricas não são aceitas.</p>
                <p><strong>Cálculo de Diária de Medicação:</strong>
                    <ul>
                        <li>Código 15005012: Soro < 500ml e < 8h.</li>
                        <li>Código 15005013: Soro > 500ml e < 8h.</li>
                        <li>Código 15005015: Atendimento > 8h.</li>
                    </ul>
                </p>
                """,
                "category": "IPSEMG"
            },
            {
                "plan": "PARTICULAR PP",
                "title": "Atendimento Particular Plancel (PP)",
                "content": """
                <h3>Fluxo Particular Plancel</h3>
                <ul>
                    <li>Utilizar Código 52 para atendimento padrão.</li>
                    <li>Em caso de Urgência/Emergência confirmada, alterar para Código 17 para custeio via convênio.</li>
                    <li>Titulares Credenciados ao Sicoob: Utilizar Código 58 (isento de cobrança final).</li>
                </ul>
                """,
                "category": "Particular"
            }
        ]
        
        # Adiciona SOPs genéricos para os outros se não houver
        for plan_name in created_plans:
            if not any(s["plan"] == plan_name for s in sops_to_create):
                sops_to_create.append({
                    "plan": plan_name,
                    "title": f"Protocolo Geral: {plan_name}",
                    "content": f"<p>Seguir o padrão de Guia TISS assinada e carimbada para o plano {plan_name}.</p>",
                    "category": "Geral"
                })

        for sop_info in sops_to_create:
            plan = created_plans[sop_info["plan"]]
            result = await db.execute(select(SOP).where(SOP.title == sop_info["title"]))
            if not result.scalar_one_or_none():
                print(f"Criando POP: {sop_info['title']}...")
                sop = SOP(
                    title=sop_info["title"],
                    category=sop_info["category"],
                    status=SOPStatus.PUBLISHED,
                    health_plan_id=plan.id,
                    created_by_id=admin.id
                )
                db.add(sop)
                await db.flush()
                
                version = SOPVersion(
                    sop_id=sop.id,
                    version_number=1,
                    content=sop_info["content"],
                    change_summary="Seed inicial",
                    created_by_id=admin.id
                )
                db.add(version)

        await db.commit()
        print("Seed concluído com sucesso!")

if __name__ == "__main__":
    asyncio.run(seed_data())
