"""
seed_v5.py — Semeadura com Guias de Treinamento Estruturados (Trilhas de Planos de Saúde)

Novidade: O campo `content` de AttendanceProtocol agora armazena um JSON
com a estrutura de GuideStep[], contendo:
  - section (string opcional): nome da seção
  - image (string opcional): URL da imagem de referência
  - instructions (string[]): lista de instruções para aquele passo

Comando:
    python -m app.modules.knowledge_base.seed_v5
"""

import asyncio
import sys
import os
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from sqlalchemy import select
from app.core.database import async_session_maker, Base, engine
from app.core.security import get_password_hash
from app.modules.auth.models import User, UserRole
from app.modules.knowledge_base.models import (
    HealthPlan, AttendanceProtocol, PatientType
)
from app.modules.spdata_guides.models import SPDATAGuide, SectorType, PatientType as GuidesPatientType
from app.modules.tuss.models import TUSSCode



# ─── Unimed External Protocol ─────────────────────────────────────────────────
# Passo a passo para criação da autorização de exames e procedimentos
# para paciente EXTERNO na Unimed.
# Link: http://srv2.unimedvc.coop.br:8082/
# ─────────────────────────────────────────────────────────────────────────────

UNIMED_EXTERNO_GUIDE: list[dict] = [
    {
        "section": "Primeiros Passos",
        "image": "/img/guides/unimed/first-steps/step-1.jpeg",
        "instructions": [
            "Acesse o sistema Unimed: http://srv2.unimedvc.coop.br:8082/",
            "Realize o login com as seguintes credenciais:",
            "  • Usuário: [EMAIL_ADDRESS]",
            "  • Senha: [PASSWORD]"
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
            "⚠️ Atenção: Inclua um '0' antes do número da carteirinha ao digitar. Ex: 0123456789"
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
            "CAMPO 41 — Será preenchido automaticamente com o nome do exame.",
            "CAMPO 42 — Inserir a quantidade do exame.",
            "CAMPO 48 — Clicar para abrir 'Selecione os Procedimentos deste Profissional'.",
            "CAMPO 51 — Inserir o Nome do Médico executor.",
            "CAMPO 50 — Inserir o CPF do Médico (geralmente auto-preenchido ao selecionar o CAMPO 51).",
            "CAMPO 55 — Preencher com: 225125"
        ]
    },
    {
        "image": "/img/guides/unimed/last-step.jpeg",
        "instructions": [
            "Revise todos os campos preenchidos.",
            "Clique em 'Solicitar Autorização' para concluir o processo.",
            "Caso autorizado, clique em 'Imprimir' para gerar a guia TISS.",
            "Solicitar a assinatura do paciente na guia TISS e o carimbo do médico.",
            "✅ Anote o número de autorização gerado para registro no sistema SPDATA."
        ]
    }
]


async def seed_data():
    print("🚀 Iniciando semeadura V5 (Trilhas de Treinamento de Planos de Saúde)...")

    async with engine.begin() as conn:
        print("🧹 Limpando e recriando tabelas...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as db:

        # ── 1. Usuários ───────────────────────────────────────────────────────
        print("👤 Criando usuários de teste...")
        users_data = [
            {"email": "admin@admin.com", "pass": "admin123", "name": "Administrador Master", "role": UserRole.ADMIN},
            {"email": "gestor@admin.com", "pass": "gestor123", "name": "Gestor de Equipe", "role": UserRole.GESTOR},
            {"email": "pa@pa.com", "pass": "pa123456", "name": "Secretária P.A.", "role": UserRole.SEC_PA},
            {"email": "ue@ue.com", "pass": "ue123456", "name": "Secretária UE-SUS", "role": UserRole.SEC_UE_SUS},
            {"email": "portaria@portaria.com", "pass": "portaria123", "name": "Portaria Principal", "role": UserRole.SEC_PORTARIA},
        ]
        for u in users_data:
            db.add(User(
                email=u["email"],
                hashed_password=get_password_hash(u["pass"]),
                full_name=u["name"],
                role=u["role"],
                is_active=True
            ))
        await db.flush()

        # ── 2. Planos de Saúde ────────────────────────────────────────────────
        print("🏥 Criando planos de saúde (Convênios)...")
        plans_data = [
            {"name": "UNIMED",        "logo": "/img/unimed94.png"},
            {"name": "IPSEMG",        "logo": "/img/ipsemg94.png"},
            {"name": "CASSI",         "logo": "/img/cassi94.png"},
            {"name": "ABRAMGE",       "logo": "/img/abramge94.png"},
            {"name": "AMAGIS",        "logo": "/img/amagis94.png"},
            {"name": "COPASS",        "logo": "/img/copass94.png"},
            {"name": "IPSM",          "logo": "/img/ipsm94.png"},
            {"name": "POSTAL SAÚDE",  "logo": "/img/postalsaude94.png"},
            {"name": "RENAL",         "logo": "/img/renal94.png"},
            {"name": "SEPASI",        "logo": "/img/sepasi94.png"},
            {"name": "SICOOB",        "logo": "/img/sicoob94.png"},
            {"name": "S.U.S.",        "logo": "/img/sus94.png"},
            {"name": "PARTICULAR",    "logo": "/img/plancel94.png"},
        ]
        created_plans: dict[str, HealthPlan] = {}
        for p in plans_data:
            plan = HealthPlan(name=p["name"], logo_path=p["logo"])
            db.add(plan)
            await db.flush()
            created_plans[p["name"]] = plan

        # ── 3. Códigos TUSS Básicos ───────────────────────────────────────────
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

        # ── 4. Protocolos de Atendimento ─────────────────────────────────────
        print("📋 Criando protocolos de atendimento...")

        # ─ UNIMED EXTERNO → Guia de treinamento completo com passos e prints ─
        db.add(AttendanceProtocol(
            health_plan_id=created_plans["UNIMED"].id,
            patient_type=PatientType.EXTERNO,
            title="Autorização de Exames e Procedimentos – Paciente Externo",
            content=json.dumps(UNIMED_EXTERNO_GUIDE, ensure_ascii=False),
        ))

        # ─ UNIMED INTERNO → Protocolo básico (a ser expandido futuramente) ─
        db.add(AttendanceProtocol(
            health_plan_id=created_plans["UNIMED"].id,
            patient_type=PatientType.INTERNO,
            title="Internação Unimed – Urgência",
            content=json.dumps([
                {
                    "instructions": [
                        "Solicitar pedido médico de internação.",
                        "Lançar no sistema SPDATA como Urgência.",
                        "Anexar termo de consentimento assinado.",
                        "Enviar para auditoria prévia da Unimed."
                    ]
                }
            ], ensure_ascii=False),
        ))

        # ─ IPSEMG EXTERNO ─
        db.add(AttendanceProtocol(
            health_plan_id=created_plans["IPSEMG"].id,
            patient_type=PatientType.EXTERNO,
            title="Protocolo IPSEMG – Ambulatorial",
            content=json.dumps([
                {
                    "instructions": [
                        "Conferir habilitação no portal GRP IPSEMG.",
                        "A assinatura do paciente deve ser idêntica ao documento de identidade.",
                        "O laudo médico deve estar preenchido sem rasuras."
                    ]
                }
            ], ensure_ascii=False),
        ))

        # ─ CASSI EXTERNO ─
        db.add(AttendanceProtocol(
            health_plan_id=created_plans["CASSI"].id,
            patient_type=PatientType.EXTERNO,
            title="Protocolo CASSI – Atendimento Geral",
            content=json.dumps([
                {
                    "instructions": [
                        "Validação via biometria ou cartão virtual.",
                        "O código de autorização deve ser gerado no início do atendimento.",
                        "Verifique se o plano é 'Plano de Associados' ou 'CASSI Família'."
                    ]
                }
            ], ensure_ascii=False),
        ))

        # ── 5. Guias SPDATA por Setor ─────────────────────────────────────────
        print("📗 Criando guias SPDATA por setor...")
        guides = [
            {"sector": SectorType.UE_SUS, "type": GuidesPatientType.EXTERNO, "title": "Início de Atendimento SUS", "content": "1. Pesquisar CNS.\n2. Módulo Recepção > Atendimento.", "order": 1},
            {"sector": SectorType.PA, "type": GuidesPatientType.EXTERNO, "title": "Check-in Paciente Particular", "content": "1. Módulo Atendimento Particular.\n2. Emitir recibo via Caixa.", "order": 1},
            {"sector": SectorType.PA, "type": GuidesPatientType.INTERNO, "title": "Internação via P.A.", "content": "1. Selecionar Pedido de Internação.\n2. Lançar Convênio Correto.", "order": 1},
            {"sector": SectorType.PORTARIA, "type": GuidesPatientType.INTERNO, "title": "Identificação de Acompanhantes", "content": "1. Digitar CPF visitante.\n2. Associar ao Leito do Paciente.", "order": 1},
        ]
        for g in guides:
            db.add(SPDATAGuide(
                sector=g["sector"],
                patient_type=g["type"],
                title=g["title"],
                content=g["content"],
                order_index=g["order"]
            ))

        await db.commit()
        print("✅ Semeadura V5 concluída — Trilhas de treinamento prontas!")
        print("\n📌 Credenciais de acesso:")
        for u in users_data:
            print(f"   {u['role'].value:20s} → {u['email']} / {u['pass']}")


if __name__ == "__main__":
    asyncio.run(seed_data())
