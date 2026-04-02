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

async def seed_data():
    print("🚀 Redefinindo banco de dados (DROP + CREATE) e iniciando semeadura V3...")
    
    async with engine.begin() as conn:
        print("🧹 Limpando tabelas existentes...")
        await conn.run_sync(Base.metadata.drop_all)
        print("🧬 Criando novas tabelas de acordo com os modelos atuais...")
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session_maker() as db:
        # 1. Criar Usuários de Teste por Setor
        print("👤 Criando usuários de teste...")
        users_data = [
            {"email": "admin@admin.com", "pass": "admin123", "name": "Administrador Master", "role": UserRole.ADMIN},
            {"email": "gestor@admin.com", "pass": "gestor123", "name": "Gestor de Equipe", "role": UserRole.GESTOR},
            {"email": "pa@pa.com", "pass": "pa123", "name": "Secretária P.A.", "role": UserRole.SEC_PA},
            {"email": "ue@ue.com", "pass": "ue123", "name": "Secretária UE-SUS", "role": UserRole.SEC_UE_SUS},
            {"email": "portaria@portaria.com", "pass": "portaria123", "name": "Portaria Principal", "role": UserRole.SEC_PORTARIA},
        ]
        
        for u in users_data:
            user = User(
                email=u["email"],
                hashed_password=get_password_hash(u["pass"]),
                full_name=u["name"],
                role=u["role"],
                is_active=True
            )
            db.add(user)
        
        await db.flush()
        admin = (await db.execute(select(User).where(User.email == "admin@admin.com"))).scalar_one()

        # 2. Criar Listagem Completa de Convênios baseada nas imagens
        print("🏥 Criando planos de saúde (Convênios)...")
        plans_data = [
            {"name": "UNIMED", "logo_path": "/img/unimed94.png"},
            {"name": "IPSEMG", "logo_path": "/img/ipsemg94.png"},
            {"name": "CASSI", "logo_path": "/img/cassi94.png"},
            {"name": "ABRAMGE", "logo_path": "/img/abramge94.png"},
            {"name": "AMAGIS", "logo_path": "/img/amagis94.png"},
            {"name": "COPASS", "logo_path": "/img/copass94.png"},
            {"name": "IPSM", "logo_path": "/img/ipsm94.png"},
            {"name": "POSTAL SAÚDE", "logo_path": "/img/postalsaude94.png"},
            {"name": "RENAL", "logo_path": "/img/renal94.png"},
            {"name": "SEPASI", "logo_path": "/img/sepasi94.png"},
            {"name": "SICOOB", "logo_path": "/img/sicoob94.png"},
            {"name": "S.U.S.", "logo_path": "/img/sus94.png"},
            {"name": "PARTICULAR", "logo_path": "/img/plancel94.png"},
        ]
        
        created_plans = {}
        for p in plans_data:
            plan = HealthPlan(name=p["name"], logo_path=p["logo_path"])
            db.add(plan)
            await db.flush()
            created_plans[p["name"]] = plan

        # 3. Criar Códigos TUSS (Lista Robustas)
        print("🔢 Criando banco de códigos TUSS...")
        tuss_list = [
            ("10101012", "Consulta em consultório (Médico Assistente)"),
            ("10101039", "Consulta em pronto socorro"),
            ("20104014", "Atendimento pediátrico a recém-nascido (sala de parto)"),
            ("20104022", "Atendimento pediátrico a recém-nascido em berçário"),
            ("30101010", "Curativo simples (por procedimento)"),
            ("30101021", "Sutura de ferimento (por cm)"),
            ("31309054", "Punção venosa central"),
            ("40101010", "ECG convencional (repouso)"),
            ("40301010", "Glicose - pesquisa e/ou dosagem"),
            ("40304361", "Hemograma completo"),
            ("40302011", "Creatinina - pesquisa e/ou dosagem"),
            ("40302518", "Uréia - pesquisa e/ou dosagem"),
            ("40302046", "Lipídios totais - pesquisa e/ou dosagem"),
            ("40302020", "Colesterol total - pesquisa e/ou dosagem"),
            ("40302216", "Sódio - pesquisa e/ou dosagem"),
            ("40302224", "Potássio - pesquisa e/ou dosagem"),
            ("40302429", "Transaminase oxalacética (Amino transferase AST)"),
            ("40302437", "Transaminase pirúvica (Amino transferase ALT)"),
            ("40314036", "Urina tipo I (EAS)"),
            ("40804010", "RX de Tórax (PA / Perfil)"),
            ("40801010", "RX de Crânio (PA / Perfil)"),
            ("40801037", "RX de Seios da Face"),
            ("40901018", "Ultrassonografia de Abdome Total"),
            ("41101010", "Tomografia Computadorizada de Crânio"),
        ]
        
        for code, desc in tuss_list:
            tuss = TUSSCode(code=code, description=desc)
            db.add(tuss)

        # 4. Criar Protocolos de Exemplo
        print("📋 Criando protocolos de atendimento para convênios...")
        protocols = [
            {
                "plan": "UNIMED",
                "type": PatientType.EXTERNO,
                "title": "Abertura de Guia Unimed - Consultas",
                "content": "1. Solicitar cartão Unimed e Identidade.\n2. Verificar validade no site autorizador.\n3. Imprimir guia TISS e colher assinatura.\n4. Carimbar no campo da secretaria.",
            },
            {
                "plan": "UNIMED",
                "type": PatientType.INTERNO,
                "title": "Internação Unimed - Urgência",
                "content": "1. Solicitar pedido médico de internação.\n2. Lançar no sistema SPDATA como Urgência.\n3. Anexar termo de consentimento assinado.\n4. Enviar para auditoria prévia.",
            },
            {
                "plan": "IPSEMG",
                "type": PatientType.EXTERNO,
                "title": "Protocolo IPSEMG - Ambulatorial",
                "content": "1. Conferir habilitação no GRP IPSEMG.\n2. A assinatura do paciente deve ser idêntica ao documento.\n3. O laudo médico deve estar preenchido sem rasuras.",
            },
            {
                "plan": "CASSI",
                "type": PatientType.EXTERNO,
                "title": "Protocolo CASSI - Atendimento Geral",
                "content": "1. Validação via biometria ou cartão virtual.\n2. O código de autorização deve ser gerado no início.\n3. Verifique se o plano é 'Plano de Associados' ou 'CASSI Família'.",
            }
        ]

        for proto in protocols:
            p_obj = AttendanceProtocol(
                health_plan_id=created_plans[proto["plan"]].id,
                patient_type=proto["type"],
                title=proto["title"],
                content=proto["content"]
            )
            db.add(p_obj)

        # 5. Criar Guias SPDATA Iniciais
        print("📗 Criando guias SPDATA por setor...")
        guides = [
            # UE_SUS
            {"sector": SectorType.UE_SUS, "type": GuidesPatientType.EXTERNO, "title": "Início de Atendimento SUS", "content": "1. Pesquisar CNS.\n2. Módulo Recepção > Atendimento.", "order": 1},
            # PA
            {"sector": SectorType.PA, "type": GuidesPatientType.EXTERNO, "title": "Check-in Paciente Particular", "content": "1. Módulo Atendimento Particular.\n2. Emitir recibo via Caixa.", "order": 1},
            {"sector": SectorType.PA, "type": GuidesPatientType.INTERNO, "title": "Internação via P.A.", "content": "1. Selecionar Pedido de Internação.\n2. Lançar Convênio Correto.", "order": 1},
            # PORTARIA
            {"sector": SectorType.PORTARIA, "type": GuidesPatientType.INTERNO, "title": "Identificação de Acompanhantes", "content": "1. Digitar CPF visitante.\n2. Associar ao Leito do Paciente.", "order": 1},
        ]
        for g in guides:
            guide = SPDATAGuide(sector=g["sector"], patient_type=g["type"], title=g["title"], content=g["content"], order_index=g["order"])
            db.add(guide)

        await db.commit()
        print("✅ Semeadura V3 (TUSS + Convênios) concluída com sucesso!")

if __name__ == "__main__":
    asyncio.run(seed_data())
