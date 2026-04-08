"""
run_seed_upsert.py — Seed IDEMPOTENTE (seguro para produção)

Diferente do run_seed_v5.py (que faz drop_all), este script usa UPSERT:
- Cria registros que não existem.
- Atualiza registros existentes se o conteúdo mudou.
- NUNCA apaga dados de outros módulos (auditoria, leituras, etc).

Chaves de upsert:
  HealthPlan          →  name (UNIQUE no modelo)
  AttendanceProtocol  →  (health_plan_id, patient_type)
  TUSSCode            →  code (UNIQUE no modelo)
  User                →  email (UNIQUE no modelo)

Uso:
    .\\venv\\Scripts\\python.exe run_seed_upsert.py
    .\\venv\\Scripts\\python.exe run_seed_upsert.py --dry-run   (sem salvar)
"""

import asyncio
import sys
import os
import json
import argparse

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from sqlalchemy import select
from app.core.database import async_session_maker, Base, engine
from app.core.security import get_password_hash

# Importações regulares (já que adicionamos o ROOT ao sys.path)
from app.modules.auth.models import User, UserRole, UserRoleLink
from app.modules.tuss.models import TUSSCode
from app.modules.knowledge_base.models import HealthPlan, AttendanceProtocol, PatientType, SOP, SOPVersion, SOPStatus
from app.modules.spdata_guides.models import SPDATAGuide, SectorType, PatientType as GuidesPatientType
from app.modules.onboarding.models import Playlist, PlaylistSOP

# ─── Constantes de Conteúdo dos Guias (Independentes) ─────────────────────────

UNIMED_EXTERNO_GUIDE = [
    {"section": "Primeiros Passos", "image": "/img/guides/unimed/first-steps/step-1.jpeg", "instructions": ["Acesse o sistema Unimed: http://srv2.unimedvc.coop.br:8082/", "Realize o login com as credenciais fornecidas pela gestão."]},
    {"section": "Primeiros Passos", "image": "/img/guides/unimed/first-steps/step-2.jpeg", "instructions": ["Na tela inicial, clique no botão 'Solicitar Execução'."]},
    {"section": "Primeiros Passos", "image": "/img/guides/unimed/first-steps/step-3.jpeg", "instructions": ["Clique em 'Informar Manualmente' para inserir os dados do paciente."]},
    {"section": "Primeiros Passos", "image": "/img/guides/unimed/first-steps/step-4.jpeg", "instructions": ["Insira o número da carteirinha do paciente.", "⚠️ Atenção: Inclua um '0' antes do número da carteirinha. Ex: 0123456789"]},
    {"section": "Primeiros Passos", "image": "/img/guides/unimed/first-steps/step-5.jpeg", "instructions": ["Clique em 'Continuar' para prosseguir para a tela de autorização."]},
    {"section": "Preenchimento da Autorização", "image": "/img/guides/unimed/step-6_fields_13-19.jpeg", "instructions": ["CAMPO 13 — Preencher com: 00000023", "CAMPO 15 — Inserir o NOME DO MÉDICO solicitante.", "CAMPOS 16, 17, 18 — Serão preenchidos automaticamente com os dados do médico.", "CAMPO 19 — Preencher com: 225125"]},
    {"section": "Preenchimento da Autorização", "image": "/img/guides/unimed/step-7_fields_21-91.jpeg", "instructions": ["CAMPO 21 — Selecionar: URGÊNCIA E EMERGÊNCIA", "CAMPO 23 — Inserir o MOTIVO do atendimento. Ex: Queda, Dor a Esclarecer", "CAMPO 32 — Selecionar: Exame", "CAMPO 91 — Selecionar: Pronto Atendimento"]},
    {"section": "Preenchimento da Autorização", "image": "/img/guides/unimed/step-8_fields_40-55.jpeg", "instructions": ["CAMPO 40 — Inserir o Código TUSS do exame solicitado.", "CAMPO 41 — Preenchido automaticamente com o nome do exame.", "CAMPO 42 — Inserir a quantidade do exame.", "CAMPO 48 — Clicar para abrir 'Selecione os Procedimentos deste Profissional'.", "CAMPO 51 — Inserir o Nome do Médico executor.", "CAMPO 50 — CPF do Médico (geralmente auto-preenchido ao selecionar CAMPO 51).", "CAMPO 55 — Preencher com: 225125"]},
    {"image": "/img/guides/unimed/last-step.jpeg", "instructions": ["Revise todos os campos preenchidos.", "Clique em 'Solicitar Autorização' para concluir o processo.", "Caso autorizado, clique em 'Imprimir' para gerar a guia TISS.", "Solicitar a assinatura do paciente na guia TISS e o carimbo do médico."]}
]

IPSEMG_INTERNACAO_GUIDE = [
    {"section": "Primeiros Passos", "image": "/img/guides/ipsemg/internacao/step-1.jpeg", "instructions": ["Acesse o sistema IPSEMG: http://safe.ipsemg.mg.gov.br/safe/", "Realize o login com Usuário e Senha fornecidos.", "⚠️ OBS SUPER IMPORTANTE: ESCANEAR A GUIA DE INTERNAÇÃO DO IPSEMG ANTES DE INICIAR O PREENCHIMENTO NO SISTEMA, POIS O SISTEMA PODE PERDER O TOKEN VALIDADE LOGIN DE 15 MINUTOS DURANTE O PREENCHIMENTO."]},
    {"section": "Primeiros Passos", "image": "/img/guides/ipsemg/internacao/step-2.jpeg", "instructions": ["No menu lateral, clique na opção 'Solicitar Internação'."]},
    {"section": "Dados da Internação", "image": "/img/guides/ipsemg/internacao/step-3.jpeg", "instructions": ["Tipo de Atendimento: Preencher se é Eletivo ou Urgência.", "Data do Pedido Médico: Inserir a data correta.", "Indicar se é Internação Clínica ou Cirúrgica.", "CID: Inserir o código da doença (Dica: Pesquisar no Google se necessário).", "Matrícula: Inserir o número que consta no cartão do convênio."]},
    {"section": "Dados Médicos e Hospitalares", "image": "/img/guides/ipsemg/internacao/step-4.jpeg", "instructions": ["Preencher os Dados do Médico Solicitante.", "Hipótese Diagnóstica: Transcrever a indicação clínica preenchida pelo médico na guia."]},
    {"section": "Dados Médicos e Hospitalares", "image": "/img/guides/ipsemg/internacao/step-5.jpeg", "instructions": ["Especialidade do médico solicitante.", "Contato: Inserir os dados do hospital (Nome, Telefone, Endereço) conforme o seu setor de atuação."]},
    {"section": "Dados Médicos e Hospitalares", "image": "/img/guides/ipsemg/internacao/step-6.jpeg", "instructions": ["Repita a Hipótese Diagnóstica ou informe observações clínicas relevantes."]},
    {"section": "Anexos", "image": "/img/guides/ipsemg/internacao/step-7.jpeg", "instructions": ["Anexar Arquivos: Faça o upload dos documentos escaneados.", "Documentos obrigatórios: Guia preenchida.", "Documentos complementares: Exames de imagem, exames laboratoriais e relatório médico (caso existam)."]},
    {"section": "Procedimentos", "image": "/img/guides/ipsemg/internacao/step-8.jpeg", "instructions": ["Digitar os códigos do procedimento solicitado pelo médico.", "📌 Para Internação Clínica, utilize o código: 16000010."]},
    {"section": "Finalização", "image": "/img/guides/ipsemg/internacao/step-9.jpg", "instructions": ["Revise as informações.", "Clique em 'Executar' no topo da página para enviar a solicitação."]},
    {"section": "Finalização", "image": "/img/guides/ipsemg/internacao/step-10.jpeg", "instructions": ["Imagem da guia autorizada.", "Imprimir e anexar a guia de internação a ser entregue à central de guias."]}
]

IPSEMG_EXTERNO_GUIDE = [
    {"section": "Primeiros Passos", "image": "/img/guides/ipsemg/step-1.jpeg", "instructions": ["Acesse o sistema IPSEMG: http://safe.ipsemg.mg.gov.br/safe/", "Realize o login com as credenciais: Usuário e Senha fornecidos."]},
    {"section": "Primeiros Passos", "image": "/img/guides/ipsemg/step-2.jpeg", "instructions": ["No menu lateral, clique na opção 'Execução de Procedimento'."]},
    {"section": "Preenchimento da Execução", "image": "/img/guides/ipsemg/step-3.jpeg", "instructions": ["Verifique se a tela de 'Execução de Procedimento' está com os campos vazios para iniciar o preenchimento."]},
    {"section": "Preenchimento da Execução", "image": "/img/guides/ipsemg/step-4.jpeg", "instructions": ["PASSO 4 — No bloco 'Execução de Procedimento', selecione a opção 'Urgencia/Emergencia'."]},
    {"section": "Preenchimento da Execução", "image": "/img/guides/ipsemg/step-5.jpeg", "instructions": ["PASSO 5 — No bloco 'Beneficiario', insira o número do cartão do paciente.", "Preencha a 'Via do Cartão' como '01' (Padrão).", "⚠️ Obs: Caso a via '01' falhe, tente a '02'."]},
    {"section": "Preenchimento da Execução", "image": "/img/guides/ipsemg/step-6.jpeg", "instructions": ["PASSO 6 — No bloco 'Profissional Executante/Solicitante', insira o CRM do médico solicitante.", "Certifique-se de que o 'Tipo do Conselho' esteja selecionado como 'CRM'."]},
    {"section": "Preenchimento da Execução", "image": "/img/guides/ipsemg/step-7.jpeg", "instructions": ["PASSO 7 — No bloco 'Procedimentos', insira o código TUSS do ambiente/exame.", "Consulte a Tabela TUSS do SiPOPs caso tenha dúvidas sobre o código correto."]},
    {"section": "Confirmação e Impressão", "image": "/img/guides/ipsemg/step-8.jpeg", "instructions": ["PASSO 8 — Clique no botão 'Executar' na parte inferior da tela.", "Uma nova aba abrirá com o PDF da autorização.", "Imprima o documento e solicite a assinatura do beneficiário.", "📌 Caso seja acompanhante: solicitar assinatura por extenso, CPF e parentesco."]},
    {"section": "Exemplo Final", "image": "/img/guides/ipsemg/step-9.jpeg", "instructions": ["Confira este exemplo de página preenchida corretamente para garantir que nada foi esquecido."]}
]

IPSM_INTERNACAO_GUIDE = [
    {"section": "Primeiros Passos", "image": "/img/guides/ipsm/internacao/step-1.jpg", "instructions": ["Acesse o portal de saúde IPSM.", "Realize o login com Usuário e Senha fornecidos pela gestão."]},
    {"section": "Primeiros Passos", "image": "/img/guides/ipsm/internacao/step-2.jpg", "instructions": ["No menu principal, localize e clique na opção 'SIGAS'."]},
    {"section": "Primeiros Passos", "image": "/img/guides/ipsm/internacao/step-3.jpg", "instructions": ["Dentro do sistema SIGAS, selecione 'Ficha de Internação'."]},
    {"section": "Identificação da Unidade", "image": "/img/guides/ipsm/internacao/step-4.jpg", "instructions": ["Insira o CNPJ do Hospital Cesar Leite: 22263081000155", "Clique em 'Continuar' para validar a unidade prestadora."]},
    {"section": "Dados do Beneficiário", "image": "/img/guides/ipsm/internacao/step-5.jpg", "instructions": ["Preencha o número do cartão do paciente.", "Dica: Clique em qualquer área branca da página para carregar os dados automaticamente.", "Confira obrigatoriamente o Nome e a Data de Nascimento exibidos."]},
    {"section": "Dados da Internação", "image": "/img/guides/ipsm/internacao/step-6.jpg", "instructions": ["Regime: Preencha se é Interno, Externo ou Hospital Dia.", "Tipo: Selecione entre Cirúrgico, Clínico, Obstétrico ou SADT.", "Caráter: Selecione Eletivo ou Urgência.", "CID: Informe o código internacional da doença.", "Acomodação: Selecione 'Enfermaria' (Dica: Geralmente solicitam-se 3 diárias iniciais)." ]},
    {"section": "Médico Solicitante", "image": "/img/guides/ipsm/internacao/step-7.jpg", "instructions": ["Preencha os campos do cabeçalho com os dados completos do Médico Solicitante."]},
    {"section": "Procedimentos", "image": "/img/guides/ipsm/internacao/step-8.jpg", "instructions": ["Digite o código do procedimento TUSS a ser autorizado.", "Informe a quantidade correta conforme o pedido médico."]},
    {"section": "Finalização", "image": "/img/guides/ipsm/internacao/step-9.jpg", "instructions": ["Caso seja atendimento interno, preencha a Indicação Clínica no final da página (conforme consta na guia física).", "Revise todos os campos e clique em enviar para autorização."]}
]


# ─── Helpers de Log ────────────────────────────────────────────────────────────

CREATED   = "✅ Criado"
UPDATED   = "🔄 Atualizado"
UNCHANGED = "⏭️  Sem mudança"
DRY       = "🔍 [DRY-RUN]"


def _log(status: str, entity: str, key: str, dry_run: bool = False):
    prefix = f"{DRY} " if dry_run else ""
    print(f"   {prefix}{status}: {entity} → '{key}'")


# ─── Upsert Helpers ────────────────────────────────────────────────────────────

async def upsert_health_plan(db, data: dict, dry_run: bool) -> HealthPlan:
    """Upsert por name (UNIQUE)."""
    result = await db.execute(select(HealthPlan).where(HealthPlan.name == data["name"]))
    plan = result.scalar_one_or_none()

    if plan is None:
        if not dry_run:
            plan = HealthPlan(**data)
            db.add(plan)
            await db.flush()
        _log(CREATED, "HealthPlan", data["name"], dry_run)
    else:
        changed = False
        for field, value in data.items():
            if getattr(plan, field) != value:
                if not dry_run:
                    setattr(plan, field, value)
                changed = True
        _log(UPDATED if changed else UNCHANGED, "HealthPlan", data["name"], dry_run)

    return plan


async def upsert_protocol(db, plan: HealthPlan, patient_type: PatientType,
                           title: str, content_obj: list, dry_run: bool):
    """Upsert por (health_plan_id, patient_type)."""
    content_str = json.dumps(content_obj, ensure_ascii=False)
    key = f"{plan.name} / {patient_type.value}"

    result = await db.execute(
        select(AttendanceProtocol)
        .where(AttendanceProtocol.health_plan_id == plan.id)
        .where(AttendanceProtocol.patient_type == patient_type)
    )
    protocol = result.scalar_one_or_none()

    if protocol is None:
        if not dry_run:
            db.add(AttendanceProtocol(
                health_plan_id=plan.id,
                patient_type=patient_type,
                title=title,
                content=content_str,
            ))
        _log(CREATED, "AttendanceProtocol", key, dry_run)
    else:
        changed = protocol.content != content_str or protocol.title != title
        if changed and not dry_run:
            protocol.content = content_str
            protocol.title = title
        _log(UPDATED if changed else UNCHANGED, "AttendanceProtocol", key, dry_run)


async def upsert_tuss(db, code: str, description: str, dry_run: bool):
    """Upsert por code (UNIQUE)."""
    result = await db.execute(select(TUSSCode).where(TUSSCode.code == code))
    existing = result.scalar_one_or_none()

    if existing is None:
        if not dry_run:
            db.add(TUSSCode(code=code, description=description))
        _log(CREATED, "TUSSCode", code, dry_run)
    elif existing.description != description:
        if not dry_run:
            existing.description = description
        _log(UPDATED, "TUSSCode", code, dry_run)


async def upsert_user(db, email: str, password: str, full_name: str,
                       roles: list, dry_run: bool):
    """Upsert usuário por email. Roles são sincronizadas."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        if not dry_run:
            user = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name=full_name,
                is_active=True,
            )
            db.add(user)
            await db.flush()
            for role_enum in roles:
                db.add(UserRoleLink(user_id=user.id, role=role_enum))
        _log(CREATED, "User", email, dry_run)
    else:
        _log(UNCHANGED, "User", email, dry_run)


# ─────────────────────────────────────────────────────────────────────────────

async def run(dry_run: bool = False):
    mode = "DRY-RUN (nenhuma mudança será salva)" if dry_run else "PRODUÇÃO"
    print(f"\n🌱 SiPOPs Seed UPSERT — Modo: {mode}")
    print("=" * 60)

    # Garantir que as tabelas existam (sem drop)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("📦 Tabelas verificadas (sem drop).\n")

    async with async_session_maker() as db:

        # ── 1. Usuários ───────────────────────────────────────────────────────
        print("👤 Usuários:")
        users_data = [
            {"email": "admin@admin.com", "pass": "admin123",   "name": "Administrador Master",
             "roles": [UserRole.ADMIN, UserRole.GESTOR]},
            {"email": "gestor@admin.com","pass": "gestor123",   "name": "Gestor de Equipe",
             "roles": [UserRole.GESTOR]},
            {"email": "pa@pa.com",       "pass": "pa123456",   "name": "Secretária P.A.",
             "roles": [UserRole.SEC_PA, UserRole.COLABORADOR]},
            {"email": "ue@ue.com",       "pass": "ue123456",   "name": "Secretária UE-SUS",
             "roles": [UserRole.SEC_UE_SUS, UserRole.COLABORADOR]},
            {"email": "portaria@portaria.com","pass": "portaria123","name": "Portaria Principal",
             "roles": [UserRole.SEC_PORTARIA, UserRole.COLABORADOR]},
        ]
        for u in users_data:
            await upsert_user(db, u["email"], u["pass"], u["name"], u["roles"], dry_run)

        # ── 2. Planos de Saúde ────────────────────────────────────────────────
        print("\n🏥 Planos de Saúde (Convênios):")
        plans_data = [
            {"name": "UNIMED",         "logo_path": "/img/unimed94.png",
             "external_portal_url": "http://srv2.unimedvc.coop.br:8082/"},
            {"name": "IPSEMG",         "logo_path": "/img/ipsemg94.png",
             "external_portal_url": "http://safe.ipsemg.mg.gov.br/safe/"},
            {"name": "CASSI",          "logo_path": "/img/cassi94.png",
             "external_portal_url": "https://www.orizonbrasil.com.br/acesso-restrito.html"},
            {"name": "ABRAMGE",        "logo_path": "/img/abramge94.png",
             "external_portal_url": None},
            {"name": "IPSM",           "logo_path": "/img/ipsm94.png",
             "external_portal_url": "http://www.sigas.ipsm.mg.gov.br/saps/portal.do"},
            {"name": "POSTAL SAÚDE",   "logo_path": "/img/postalsaude94.png",
             "external_portal_url": "https://autorizador.postalsaudeservicos.com.br/autorizadorpro/custom/CustomLogin.aspx"},
            {"name": "SICOOB",         "logo_path": "/img/sicoob94.png",
             "external_portal_url": None},
            {"name": "S.U.S.",         "logo_path": "/img/sus94.png",
             "external_portal_url": None},
            {"name": "PARTICULAR",     "logo_path": "/img/plancel94.png",
             "external_portal_url": None},
            {"name": "PARTICULAR TOTAL","logo_path": "/img/plancel94.png",
             "external_portal_url": None},
        ]
        created_plans = {}
        for p in plans_data:
            plan = await upsert_health_plan(db, p, dry_run)
            if plan:
                created_plans[p["name"]] = plan
            else:
                # dry-run: buscar o existente para continuar o fluxo
                res = await db.execute(select(HealthPlan).where(HealthPlan.name == p["name"]))
                existing = res.scalar_one_or_none()
                if existing:
                    created_plans[p["name"]] = existing

        if not dry_run:
            await db.flush()

        # ── 3. TUSS ───────────────────────────────────────────────────────────
        print("\n🔢 Códigos TUSS:")
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
            ("16000010", "Internação Clínica (diária)"),
        ]
        tuss_created = tuss_updated = tuss_unchanged = 0
        for code, desc in tuss_list:
            res = await db.execute(select(TUSSCode).where(TUSSCode.code == code))
            existing = res.scalar_one_or_none()
            if existing is None:
                tuss_created += 1
            elif existing.description != desc:
                tuss_updated += 1
            else:
                tuss_unchanged += 1
            await upsert_tuss(db, code, desc, dry_run)
        print(f"   Resumo: {tuss_created} criados, {tuss_updated} atualizados, {tuss_unchanged} sem mudança")

        # ── 4. Protocolos de Atendimento ─────────────────────────────────────
        print("\n📋 Protocolos de Atendimento:")
        protocols = [
            ("UNIMED", PatientType.EXTERNO,
             "Autorização de Exames e Procedimentos UNIMED – Paciente Externo",
             UNIMED_EXTERNO_GUIDE),
            ("UNIMED", PatientType.INTERNO,
             "Internação Unimed – Urgência",
             [{"instructions": ["Solicitar pedido médico de internação.",
                                "Lançar no sistema SPDATA como Urgência.",
                                "Anexar termo de consentimento assinado.",
                                "Enviar para auditoria prévia da Unimed."]}]),
            ("IPSEMG", PatientType.EXTERNO,
             "Autorização de Exames IPSEMG – Paciente Externo",
             IPSEMG_EXTERNO_GUIDE),
            ("IPSEMG", PatientType.INTERNO,
             "Internação Clínica e Cirúrgica IPSEMG",
             IPSEMG_INTERNACAO_GUIDE),
            ("IPSM", PatientType.INTERNO,
             "Internação Hospitalar IPSM (SIGAS)",
             IPSM_INTERNACAO_GUIDE),
            ("CASSI", PatientType.EXTERNO,
             "Protocolo CASSI – Atendimento Geral",
             [{"instructions": ["Validação via biometria ou cartão virtual.",
                                "O código de autorização deve ser gerado no início do atendimento.",
                                "Verifique se o plano é 'Plano de Associados' ou 'CASSI Família'."]}]),
        ]

        for plan_name, patient_type, title, content in protocols:
            if plan_name in created_plans:
                await upsert_protocol(db, created_plans[plan_name],
                                      patient_type, title, content, dry_run)

        if not dry_run:
            await db.commit()
            print("\n✅ Commit realizado com sucesso!")
        else:
            print("\n🔍 DRY-RUN concluído — nenhuma alteração foi salva.")

    print("\n" + "=" * 60)
    print("🌱 Seed UPSERT finalizado.")
    print()
    print("💡 Dica: Use --dry-run para inspecionar mudanças sem salvar.")
    print("💡 Para RESET TOTAL do banco, use: run_seed_v5.py")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SiPOPs Seed Idempotente (Upsert)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Inspeciona mudanças sem salvar no banco")
    args = parser.parse_args()
    asyncio.run(run(dry_run=args.dry_run))
