import asyncio
import sys
import os
import json

# Adiciona o diretório raiz ao path para permitir imports do app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from sqlalchemy import select
from app.core.database import async_session_maker, Base, engine, init_db
from app.core.security import get_password_hash
from app.modules.auth.models import User, UserRole
from app.modules.knowledge_base.models import HealthPlan, SOP, SOPStatus, SOPVersion, AttendanceProtocol, PatientType
from app.modules.spdata_guides.models import SPDATAGuide, SectorType, PatientType as GuidesPatientType
from app.modules.tuss.models import TUSSCode, TUSSUsage
from app.modules.onboarding.models import Playlist, PlaylistSOP
from app.modules.chat.models import ChatMessage

async def seed_data():
    print("Redefinindo banco de dados (DROP + CREATE) e iniciando semeadura V2...")
    
    # IMPORTANTE: Importar todos os modelos para que o SQLAlchemy os conheça ao fazer drop_all/create_all
    # Já importados no topo, mas garantindo que estão no escopo
    
    async with engine.begin() as conn:
        print("Limpando tabelas existentes...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Criando novas tabelas...")
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session_maker() as db:
        # 2. Criar usuário admin
        print("Criando usuário admin (admin@admin.com)...")
        admin = User(
            email="admin@admin.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrador Master",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        await db.flush()

        # 3. Criar Planos de Saúde
        print("Criando planos de saúde...")
        plans_data = [
            {"name": "UNIMED", "logo_path": "/img/unimed94.png"},
            {"name": "IPSEMG", "logo_path": "/img/ipsemg94.png"},
            {"name": "CASSI", "logo_path": "/img/cassi94.png"},
            {"name": "PARTICULAR", "logo_path": "/img/plancel94.png"},
        ]
        
        created_plans = {}
        for p in plans_data:
            plan = HealthPlan(name=p["name"], logo_path=p["logo_path"])
            db.add(plan)
            await db.flush()
            created_plans[p["name"]] = plan

        # 4. Criar Protocolos de Atendimento (Feature 2)
        print("Criando protocolos de atendimento...")
        protocols = [
            {
                "plan": "UNIMED",
                "type": PatientType.EXTERNO,
                "title": "Abertura de Guia Unimed - Consultas",
                "content": "1. Solicitar cartão Unimed e Identidade.\n2. Verificar validade no site autorizador.\n3. Imprimir guia TISS e colher assinatura.\n4. Carimbar no campo da secretaria.",
                "images": ["https://placehold.co/600x400?text=Exemplo+Guia+TISS+Unimed"]
            },
            {
                "plan": "UNIMED",
                "type": PatientType.INTERNO,
                "title": "Internação Unimed - Urgência",
                "content": "1. Solicitar pedido médico de internação.\n2. Lançar no sistema SPDATA como Urgência.\n3. Anexar termo de consentimento assinado.\n4. Enviar via sistema para auditoria prévia.",
                "images": ["https://placehold.co/600x400?text=Tela+Internacao+SPDATA"]
            },
            {
                "plan": "IPSEMG",
                "type": PatientType.EXTERNO,
                "title": "Protocolo IPSEMG - Ambulatorial",
                "content": "1. Conferir se a carteira está ativa no site do IPSEMG.\n2. A assinatura do paciente deve ser POR EXTENSO (sem abreviações).\n3. O laudo médico é obrigatório.",
            }
        ]

        for proto in protocols:
            plan = created_plans[proto["plan"]]
            p_obj = AttendanceProtocol(
                health_plan_id=plan.id,
                patient_type=proto["type"],
                title=proto["title"],
                content=proto["content"],
                images_json=json.dumps(proto.get("images", []))
            )
            db.add(p_obj)

        # 5. Criar Guias SPDATA (Feature 1)
        print("Criando guias de uso SPDATA...")
        guides = [
            # UE_SUS
            {
                "sector": SectorType.UE_SUS,
                "type": GuidesPatientType.EXTERNO,
                "title": "Recepção Paciente SUS - Ficha de Atendimento",
                "content": "1. Pesquisar paciente pelo CNS ou CPF.\n2. No módulo Recepção, clicar em 'Novo Atendimento'.\n3. Selecionar Convênio: SUS.\n4. Salvar e encaminhar para a triagem.",
                "order": 1
            },
            # PA
            {
                "sector": SectorType.PA,
                "type": GuidesPatientType.EXTERNO,
                "title": "Abertura de Prontuário P.A. Particular",
                "content": "1. Acessar Módulo Atendimento > Particular.\n2. Conferir dados cadastrais.\n3. Realizar o recebimento no caixa antes do início do atendimento.",
                "order": 1
            },
            # PORTARIA
            {
                "sector": SectorType.PORTARIA,
                "type": GuidesPatientType.INTERNO,
                "title": "Controle de Acesso de Acompanhantes",
                "content": "1. Identificar o paciente no sistema.\n2. Clicar em 'Acompanhantes'.\n3. Cadastrar nome e RG do visitante.\n4. Imprimir etiqueta de acesso.",
                "order": 1
            }
        ]

        for g in guides:
            guide = SPDATAGuide(
                sector=g["sector"],
                patient_type=g["type"],
                title=g["title"],
                content=g["content"],
                order_index=g["order"]
            )
            db.add(guide)

        # 6. Criar alguns POPs legados para teste
        print("Criando POPs de exemplo...")
        sop = SOP(
            title="Protocolo Geral de Higienização",
            category="Geral",
            status=SOPStatus.PUBLISHED,
            created_by_id=admin.id
        )
        db.add(sop)
        await db.flush()
        
        version = SOPVersion(
            sop_id=sop.id,
            version_number=1,
            content="Instruções de lavagem das mãos seguindo manual da ANVISA.",
            created_by_id=admin.id
        )
        db.add(version)

        await db.commit()
        print("Semeadura V2 concluída com sucesso!")

if __name__ == "__main__":
    asyncio.run(seed_data())
