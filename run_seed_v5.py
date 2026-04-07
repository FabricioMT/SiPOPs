"""
run_seed_v5.py — Script direto para popular o banco com Guias de Treinamento (Trilhas)

Uso:
    .\\venv\\Scripts\\python.exe run_seed_v5.py
"""

import asyncio
import sys
import os
import json
import importlib.util

# Adiciona o diretório raiz ao path
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

# Importar módulos diretamente para evitar circular import via __init__.py
from sqlalchemy import select
from app.core.database import async_session_maker, Base, engine
from app.core.security import get_password_hash

# Importar modelos diretamente (bypassando __init__ que carrega os routers)
from app.modules.auth.models import User, UserRole, UserRoleLink
from app.modules.tuss.models import TUSSCode

# Importar modelos do knowledge_base diretamente
import importlib.util as _ilu
import sys as _sys

def _import_direct(module_name, file_path):
    """Importa um módulo diretamente pelo path do arquivo."""
    spec = _ilu.spec_from_file_location(module_name, file_path)
    mod = _ilu.module_from_spec(spec)
    _sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod

# Importar modelos que causam circular dependency diretamente
_kb_models = _import_direct(
    "app.modules.knowledge_base.models",
    os.path.join(ROOT, "app", "modules", "knowledge_base", "models.py")
)
HealthPlan = _kb_models.HealthPlan
AttendanceProtocol = _kb_models.AttendanceProtocol
PatientType = _kb_models.PatientType
SOP = _kb_models.SOP
SOPVersion = _kb_models.SOPVersion
SOPReading = _kb_models.SOPReading
SOPStatus = _kb_models.SOPStatus

_spdata_models = _import_direct(
    "app.modules.spdata_guides.models",
    os.path.join(ROOT, "app", "modules", "spdata_guides", "models.py")
)
SPDATAGuide = _spdata_models.SPDATAGuide
SectorType = _spdata_models.SectorType
GuidesPatientType = _spdata_models.PatientType

# Registrar modelos de onboarding
_onb_models = _import_direct(
    "app.modules.onboarding.models",
    os.path.join(ROOT, "app", "modules", "onboarding", "models.py")
)
Playlist = _onb_models.Playlist
PlaylistSOP = _onb_models.PlaylistSOP

# Registrar modelos de chat
_chat_models = _import_direct(
    "app.modules.chat.models",
    os.path.join(ROOT, "app", "modules", "chat", "models.py")
)


# ─── Guia Unimed Externo ──────────────────────────────────────────────────────

UNIMED_EXTERNO_GUIDE = [
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/unimed/first-steps/step-1.jpeg",
        "instructions": [
            "Acesse o sistema Unimed: http://srv2.unimedvc.coop.br:8082/",
            "Realize o login com as credenciais fornecidas pela gestão."
        ]
    },
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/unimed/first-steps/step-2.jpeg",
        "instructions": [
            "Na tela inicial, clique no botão 'Solicitar Execução'."
        ]
    },
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/unimed/first-steps/step-3.jpeg",
        "instructions": [
            "Clique em 'Informar Manualmente' para inserir os dados do paciente."
        ]
    },
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/unimed/first-steps/step-4.jpeg",
        "instructions": [
            "Insira o número da carteirinha do paciente.",
            "⚠️ Atenção: Inclua um '0' antes do número da carteirinha. Ex: 0123456789"
        ]
    },
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/unimed/first-steps/step-5.jpeg",
        "instructions": [
            "Clique em 'Continuar' para prosseguir para a tela de autorização."
        ]
    },
    {
        "section": "Preenchimento da Autorização",
        "image": "/img/guides/unimed/step-6_fields_13-19.jpeg",
        "instructions": [
            "CAMPO 13 — Preencher com: 00000023",
            "CAMPO 15 — Inserir o NOME DO MÉDICO solicitante.",
            "CAMPOS 16, 17, 18 — Serão preenchidos automaticamente com os dados do médico.",
            "CAMPO 19 — Preencher com: 225125"
        ]
    },
    {
        "section": "Preenchimento da Autorização",
        "image": "/img/guides/unimed/step-7_fields_21-91.jpeg",
        "instructions": [
            "CAMPO 21 — Selecionar: URGÊNCIA E EMERGÊNCIA",
            "CAMPO 23 — Inserir o MOTIVO do atendimento. Ex: Queda, Dor a Esclarecer",
            "CAMPO 32 — Selecionar: Exame",
            "CAMPO 91 — Selecionar: Pronto Atendimento"
        ]
    },
    {
        "section": "Preenchimento da Autorização",
        "image": "/img/guides/unimed/step-8_fields_40-55.jpeg",
        "instructions": [
            "CAMPO 40 — Inserir o Código TUSS do exame solicitado.",
            "CAMPO 41 — Preenchido automaticamente com o nome do exame.",
            "CAMPO 42 — Inserir a quantidade do exame.",
            "CAMPO 48 — Clicar para abrir 'Selecione os Procedimentos deste Profissional'.",
            "CAMPO 51 — Inserir o Nome do Médico executor.",
            "CAMPO 50 — CPF do Médico (geralmente auto-preenchido ao selecionar CAMPO 51).",
            "CAMPO 55 — Preencher com: 225125"
        ]
    },
    {
        "image": "/img/guides/unimed/last-step.jpeg",
        "instructions": [
            "Revise todos os campos preenchidos.",
            "Clique em 'Solicitar Autorização' para concluir o processo.",
            "Caso autorizado, clique em 'Imprimir' para gerar a guia TISS.",
            "Solicitar a assinatura do paciente na guia TISS e o carimbo do médico."
        ]
    }
]


# ─── Guia IPSEMG Internação (Hospitalar) ──────────────────────────────────────

IPSEMG_INTERNACAO_GUIDE = [
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/ipsemg/internacao/step-1.jpeg",
        "instructions": [
            "Acesse o sistema IPSEMG: http://safe.ipsemg.mg.gov.br/safe/",
            "Realize o login com Usuário e Senha fornecidos.",
            "⚠️ OBS SUPER IMPORTANTE: ESCANEAR A GUIA DE INTERNAÇÃO DO IPSEMG ANTES DE INICIAR O PREENCHIMENTO NO SISTEMA, POIS O SISTEMA PODE PERDER O TOKEN VALIDADE LOGIN DE 15 MINUTOS DURANTE O PREENCHIMENTO."
        ]
    },
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/ipsemg/internacao/step-2.jpeg",
        "instructions": [
            "No menu lateral, clique na opção 'Solicitar Internação'."
        ]
    },
    {
        "section": "Dados da Internação",
        "image": "/img/guides/ipsemg/internacao/step-3.jpeg",
        "instructions": [
            "Tipo de Atendimento: Preencher se é Eletivo ou Urgência.",
            "Data do Pedido Médico: Inserir a data correta.",
            "Indicar se é Internação Clínica ou Cirúrgica.",
            "CID: Inserir o código da doença (Dica: Pesquisar no Google se necessário).",
            "Matrícula: Inserir o número que consta no cartão do convênio."
        ]
    },
    {
        "section": "Dados Médicos e Hospitalares",
        "image": "/img/guides/ipsemg/internacao/step-4.jpeg",
        "instructions": [
            "Preencher os Dados do Médico Solicitante.",
            "Hipótese Diagnóstica: Transcrever a indicação clínica preenchida pelo médico na guia."
        ]
    },
    {
        "section": "Dados Médicos e Hospitalares",
        "image": "/img/guides/ipsemg/internacao/step-5.jpeg",
        "instructions": [
            "Especialidade do médico solicitante.",
            "Contato: Inserir os dados do hospital (Nome, Telefone, Endereço) conforme o seu setor de atuação."
        ]
    },
    {
        "section": "Dados Médicos e Hospitalares",
        "image": "/img/guides/ipsemg/internacao/step-6.jpeg",
        "instructions": [
            "Repita a Hipótese Diagnóstica ou informe observações clínicas relevantes."
        ]
    },
    {
        "section": "Anexos",
        "image": "/img/guides/ipsemg/internacao/step-7.jpeg",
        "instructions": [
            "Anexar Arquivos: Faça o upload dos documentos escaneados.",
            "Documentos obrigatórios: Guia preenchida.",
            "Documentos complementares: Exames de imagem, exames laboratoriais e relatório médico (caso existam)."
        ]
    },
    {
        "section": "Procedimentos",
        "image": "/img/guides/ipsemg/internacao/step-8.jpeg",
        "instructions": [
            "Digitar os códigos do procedimento solicitado pelo médico.",
            "📌 Para Internação Clínica, utilize o código: 16000010."
        ]
    },
    {
        "section": "Finalização",
        "image": "/img/guides/ipsemg/internacao/step-9.jpg",
        "instructions": [
            "Revise as informações.",
            "Clique em 'Executar' no topo da página para enviar a solicitação."
        ]
    },
    {
        "section": "Finalização",
        "image": "/img/guides/ipsemg/internacao/step-10.jpeg",
        "instructions": [
            "Imagem da guia autorizada.",
            "Imprimir e anexar a guia de internação a ser entregue à central de guias."
        ]
    }
]


# ─── Guia IPSEMG Externo ──────────────────────────────────────────────────────

IPSEMG_EXTERNO_GUIDE = [
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/ipsemg/step-1.jpeg",
        "instructions": [
            "Acesse o sistema IPSEMG: http://safe.ipsemg.mg.gov.br/safe/",
            "Realize o login com as credenciais: Usuário e Senha fornecidos."
        ]
    },
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/ipsemg/step-2.jpeg",
        "instructions": [
            "No menu lateral, clique na opção 'Execução de Procedimento'."
        ]
    },
    {
        "section": "Preenchimento da Execução",
        "image": "/img/guides/ipsemg/step-3.jpeg",
        "instructions": [
            "Verifique se a tela de 'Execução de Procedimento' está com os campos vazios para iniciar o preenchimento."
        ]
    },
    {
        "section": "Preenchimento da Execução",
        "image": "/img/guides/ipsemg/step-4.jpeg",
        "instructions": [
            "PASSO 4 — No bloco 'Execução de Procedimento', selecione a opção 'Urgencia/Emergencia'."
        ]
    },
    {
        "section": "Preenchimento da Execução",
        "image": "/img/guides/ipsemg/step-5.jpeg",
        "instructions": [
            "PASSO 5 — No bloco 'Beneficiario', insira o número do cartão do paciente.",
            "Preencha a 'Via do Cartão' como '01' (Padrão).",
            "⚠️ Obs: Caso a via '01' falhe, tente a '02'."
        ]
    },
    {
        "section": "Preenchimento da Execução",
        "image": "/img/guides/ipsemg/step-6.jpeg",
        "instructions": [
            "PASSO 6 — No bloco 'Profissional Executante/Solicitante', insira o CRM do médico solicitante.",
            "Certifique-se de que o 'Tipo do Conselho' esteja selecionado como 'CRM'."
        ]
    },
    {
        "section": "Preenchimento da Execução",
        "image": "/img/guides/ipsemg/step-7.jpeg",
        "instructions": [
            "PASSO 7 — No bloco 'Procedimentos', insira o código TUSS do ambiente/exame.",
            "Consulte a Tabela TUSS do SiPOPs caso tenha dúvidas sobre o código correto."
        ]
    },
    {
        "section": "Confirmação e Impressão",
        "image": "/img/guides/ipsemg/step-8.jpeg",
        "instructions": [
            "PASSO 8 — Clique no botão 'Executar' na parte inferior da tela.",
            "Uma nova aba abrirá com o PDF da autorização.",
            "Imprima o documento e solicite a assinatura do beneficiário.",
            "📌 Caso seja acompanhante: solicitar assinatura por extenso, CPF e parentesco."
        ]
    },
    {
        "section": "Exemplo Final",
        "image": "/img/guides/ipsemg/step-9.jpeg",
        "instructions": [
            "Confira este exemplo de página preenchida corretamente para garantir que nada foi esquecido."
        ]
    }
]


async def seed_data():
    print("🚀 Semeadura V5 — Trilhas de Treinamento de Planos de Saúde")
    print("=" * 60)

    async with engine.begin() as conn:
        print("🧹 Limpando e recriando tabelas...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as db:

        # ── 1. Usuários ───────────────────────────────────────────────────────
        print("👤 Criando usuários de teste...")
        users_data = [
            {"email": "admin@admin.com", "pass": "admin123", "name": "Administrador Master", "roles": [UserRole.ADMIN, UserRole.GESTOR]},
            {"email": "gestor@admin.com", "pass": "gestor123", "name": "Gestor de Equipe", "roles": [UserRole.GESTOR]},
            {"email": "pa@pa.com", "pass": "pa123456", "name": "Secretária P.A.", "roles": [UserRole.SEC_PA, UserRole.COLABORADOR]},
            {"email": "ue@ue.com", "pass": "ue123456", "name": "Secretária UE-SUS", "roles": [UserRole.SEC_UE_SUS, UserRole.COLABORADOR]},
            {"email": "portaria@portaria.com", "pass": "portaria123", "name": "Portaria Principal", "roles": [UserRole.SEC_PORTARIA, UserRole.COLABORADOR]},
        ]
        
        for u in users_data:
            user = User(
                email=u["email"],
                hashed_password=get_password_hash(u["pass"]),
                full_name=u["name"],
                is_active=True
            )
            db.add(user)
            await db.flush() # Para gerar o user.id
            
            # Adicionar roles via UserRoleLink
            for role_enum in u["roles"]:
                db.add(UserRoleLink(user_id=user.id, role=role_enum))
        
        await db.flush()
        print(f"   ✅ {len(users_data)} usuários criados com múltiplas funções")

        # ── 2. Planos de Saúde ────────────────────────────────────────────────
        print("🏥 Criando planos de saúde (Convênios)...")
        plans_data = [
            {"name": "UNIMED",        "logo": "/img/unimed94.png", "portal": "http://srv2.unimedvc.coop.br:8082/"},
            {"name": "IPSEMG",        "logo": "/img/ipsemg94.png", "portal": "http://safe.ipsemg.mg.gov.br/safe/"},
            {"name": "CASSI",         "logo": "/img/cassi94.png", "portal": None},
            {"name": "ABRAMGE",       "logo": "/img/abramge94.png", "portal": None},
            {"name": "IPSM",          "logo": "/img/ipsm94.png", "portal": None},
            {"name": "POSTAL SAÚDE",  "logo": "/img/postalsaude94.png", "portal": None},
            {"name": "SICOOB",        "logo": "/img/sicoob94.png", "portal": None},
            {"name": "S.U.S.",        "logo": "/img/sus94.png", "portal": None},
            {"name": "PARTICULAR",    "logo": "/img/plancel94.png", "portal": None},
            {"name": "PARTICULAR TOTAL",    "logo": "/img/plancel94.png", "portal": None},
        ]
        
        created_plans = {}
        for p in plans_data:
            plan = HealthPlan(name=p["name"], logo_path=p["logo"], external_portal_url=p["portal"])
            db.add(plan)
            await db.flush()
            created_plans[p["name"]] = plan
        print(f"   ✅ {len(plans_data)} planos criados")

        # ── 3. Códigos TUSS ───────────────────────────────────────────────────
        print("🔢 Criando banco de códigos TUSS...")
        tuss_list = [
            ("10101012", "Consulta em consultório (Médico Assistente)"),
            ("10101039", "Consulta em pronto socorro"),
            ("20104014", "Atendimento pediátrico a recém-nascido (sala de parto)"),
            ("30101010", "Curativo simples (por procedimento)"),
            ("30101021", "Sutura de ferimento (por cm)"),
            ("31309054", "Punção venosa central"),
            ("40101010", "ECG convencional (repouso)"),
            ("40301010", "Glicose - pesquisa e/ou dosagem"),
            ("40304361", "Hemograma completo"),
            ("40302011", "Creatinina - pesquisa e/ou dosagem"),
            ("40302518", "Uréia - pesquisa e/ou dosagem"),
            ("40302216", "Sódio - pesquisa e/ou dosagem"),
            ("40302224", "Potássio - pesquisa e/ou dosagem"),
            ("40302429", "Transaminase oxalacética (AST)"),
            ("40302437", "Transaminase pirúvica (ALT)"),
            ("40314036", "Urina tipo I (EAS)"),
            ("40804010", "RX de Tórax (PA / Perfil)"),
            ("40801010", "RX de Crânio (PA / Perfil)"),
            ("40801037", "RX de Seios da Face"),
            ("40901018", "Ultrassonografia de Abdome Total"),
            ("41101010", "Tomografia Computadorizada de Crânio"),
        ]
        for code, desc in tuss_list:
            db.add(TUSSCode(code=code, description=desc))
        print(f"   ✅ {len(tuss_list)} códigos TUSS criados")

        # ── 4. Protocolos de Atendimento ─────────────────────────────────────
        print("📋 Criando protocolos e guias de treinamento...")

        db.add(AttendanceProtocol(
            health_plan_id=created_plans["UNIMED"].id,
            patient_type=PatientType.EXTERNO,
            title="Autorização de Exames e Procedimentos UNIMED – Paciente Externo",
            content=json.dumps(UNIMED_EXTERNO_GUIDE, ensure_ascii=False),
        ))

        db.add(AttendanceProtocol(
            health_plan_id=created_plans["UNIMED"].id,
            patient_type=PatientType.INTERNO,
            title="Internação Unimed – Urgência",
            content=json.dumps([{
                "instructions": [
                    "Solicitar pedido médico de internação.",
                    "Lançar no sistema SPDATA como Urgência.",
                    "Anexar termo de consentimento assinado.",
                    "Enviar para auditoria prévia da Unimed."
                ]
            }], ensure_ascii=False),
        ))

        db.add(AttendanceProtocol(
            health_plan_id=created_plans["IPSEMG"].id,
            patient_type=PatientType.EXTERNO,
            title="Autorização de Exames IPSEMG – Paciente Externo",
            content=json.dumps(IPSEMG_EXTERNO_GUIDE, ensure_ascii=False),
        ))

        db.add(AttendanceProtocol(
            health_plan_id=created_plans["IPSEMG"].id,
            patient_type=PatientType.INTERNO,
            title="Internação Clínica e Cirúrgica IPSEMG",
            content=json.dumps(IPSEMG_INTERNACAO_GUIDE, ensure_ascii=False),
        ))

        db.add(AttendanceProtocol(
            health_plan_id=created_plans["CASSI"].id,
            patient_type=PatientType.EXTERNO,
            title="Protocolo CASSI – Atendimento Geral",
            content=json.dumps([{
                "instructions": [
                    "Validação via biometria ou cartão virtual.",
                    "O código de autorização deve ser gerado no início do atendimento.",
                    "Verifique se o plano é 'Plano de Associados' ou 'CASSI Família'."
                ]
            }], ensure_ascii=False),
        ))
        print("   ✅ Protocolos UNIMED (externo + interno), IPSEMG, CASSI criados")

        # ── 5. Guias SPDATA ───────────────────────────────────────────────────
        print("📗 Configurando guias SPDATA por setor...")
        guides = [
            {"sector": SectorType.UE_SUS, "type": GuidesPatientType.EXTERNO,
             "title": "Início de Atendimento SUS", "content": "1. Pesquisar CNS.\n2. Módulo Recepção > Atendimento.", "order": 1},
            {"sector": SectorType.PA, "type": GuidesPatientType.EXTERNO,
             "title": "Check-in Paciente Particular", "content": "1. Módulo Atendimento Particular.\n2. Emitir recibo via Caixa.", "order": 1},
            {"sector": SectorType.PA, "type": GuidesPatientType.INTERNO,
             "title": "Internação via P.A.", "content": "1. Selecionar Pedido de Internação.\n2. Lançar Convênio Correto.", "order": 1},
            {"sector": SectorType.PORTARIA, "type": GuidesPatientType.INTERNO,
             "title": "Identificação de Acompanhantes", "content": "1. Digitar CPF visitante.\n2. Associar ao Leito do Paciente.", "order": 1},
        ]
        for g in guides:
            db.add(SPDATAGuide(
                sector=g["sector"], patient_type=g["type"],
                title=g["title"], content=g["content"], order_index=g["order"]
            ))
        print(f"   ✅ {len(guides)} guias SPDATA criados")

        # ── 6. Onboarding Playlists ───────────────────────────────────────────
        print("🎯 Criando trilhas de onboarding...")
        
        # Recupera o usuário admin para 'created_by_id'
        admin_res = await db.execute(select(User).where(User.email == "admin@admin.com"))
        admin_user = admin_res.scalar_one()

        # Create a playlist
        playlist = Playlist(
            title="Trilha de Capacitação",
            description="Procedimentos essenciais para recepção e autorização de convênios.",
            created_by_id=admin_user.id
        )
        db.add(playlist)
        await db.flush()

        # Add the Unimed Protocol to this playlist
        proto_res = await db.execute(
            select(AttendanceProtocol)
            .where(AttendanceProtocol.health_plan_id == created_plans["UNIMED"].id)
            .where(AttendanceProtocol.patient_type == PatientType.EXTERNO)
        )
        unimed_proto = proto_res.scalar_one()

        db.add(PlaylistSOP(
            playlist_id=playlist.id,
            protocol_id=unimed_proto.id,
            order_index=1
        ))

        # Add the IPSEMG Protocol to this playlist
        ipsemg_res = await db.execute(
            select(AttendanceProtocol)
            .where(AttendanceProtocol.health_plan_id == created_plans["IPSEMG"].id)
            .where(AttendanceProtocol.patient_type == PatientType.EXTERNO)
        )
        ipsemg_proto = ipsemg_res.scalar_one()

        db.add(PlaylistSOP(
            playlist_id=playlist.id,
            protocol_id=ipsemg_proto.id,
            order_index=2
        ))

        # Add a placeholder SOP as well to test mixed content
        sop = SOP(
            title="Normas de Atendimento Geral",
            category="Geral",
            status=SOPStatus.PUBLISHED,
            created_by_id=admin_user.id
        )
        db.add(sop)
        await db.flush()
        
        # Add a version for the SOP so it shows up in progress
        db.add(SOPVersion(
            sop_id=sop.id,
            version_number=1,
            content="Instruções gerais de conduta e atendimento ao cliente.",
            created_by_id=admin_user.id
        ))

        db.add(PlaylistSOP(
            playlist_id=playlist.id,
            sop_id=sop.id,
            order_index=3
        ))

        print(f"   ✅ Trilha '{playlist.title}' criada com 1 protocolo e 1 SOP")

        await db.commit()

    print()
    print("✅ Semeadura V5 concluída com sucesso!")
    print()
    print("📌 Credenciais de acesso:")
    for u in users_data:
        roles_str = ", ".join([r.value for r in u["roles"]])
        print(f"   {roles_str:25s} → {u['email']} / {u['pass']}")


if __name__ == "__main__":
    asyncio.run(seed_data())
