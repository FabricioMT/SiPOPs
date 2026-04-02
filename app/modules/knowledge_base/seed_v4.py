import asyncio
import sys
import os
import json
import pandas as pd

# Adiciona o diretório raiz ao path para permitir imports do app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from sqlalchemy import select, delete
from app.core.database import async_session_maker, Base, engine, init_db
from app.core.security import get_password_hash
from app.modules.auth.models import User, UserRole
from app.modules.knowledge_base.models import HealthPlan, SOP, SOPStatus, SOPVersion, AttendanceProtocol, PatientType
from app.modules.spdata_guides.models import SPDATAGuide, SectorType, PatientType as GuidesPatientType
from app.modules.tuss.models import TUSSCode, TUSSUsage
from app.modules.onboarding.models import Playlist, PlaylistSOP

async def import_tuss_from_xls(db):
    file_path = 'temp/Codigos TUSS.xls'
    if not os.path.exists(file_path):
        print(f"❌ Arquivo TUSS não encontrado em: {file_path}")
        return

    try:
        print(f"📄 Lendo {file_path}...")
        # Lendo XLS, pulando as primeiras 10 linhas conforme inspect_tuss.py
        df = pd.read_excel(file_path, skiprows=10)
        
        # Filtra linhas válidas (código e descrição não vazios)
        df = df.dropna(subset=[df.columns[0], df.columns[1]])
        
        # Limpa os códigos (converte float para str e remove .0)
        df[df.columns[0]] = df[df.columns[0]].astype(str).str.replace('\.0$', '', regex=True)
        
        records = []
        for _, row in df.iterrows():
            code = str(row[df.columns[0]]).strip()
            desc = str(row[df.columns[1]]).strip()
            
            if code and desc and code.isdigit():
                records.append({
                    "code": code,
                    "description": desc
                })

        print(f"✅ Encontrados {len(records)} registros TUSS válidos.")

        # Inserção em lotes
        total_imported = 0
        for i in range(0, len(records), 200):
            batch = records[i:i+200]
            db_objects = [TUSSCode(code=r["code"], description=r["description"]) for r in batch]
            db.add_all(db_objects)
            await db.flush()
            total_imported += len(batch)
            if total_imported % 1000 == 0 or total_imported == len(records):
                print(f"📦 Importados {total_imported} / {len(records)} códigos TUSS...")

    except Exception as e:
        print(f"⚠️ Erro ao importar TUSS: {e}")

async def seed_data():
    print("🚀 Redefinindo banco de dados (DROP + CREATE) e iniciando semeadura V4...")
    
    async with engine.begin() as conn:
        print("🧹 Limpando tabelas existentes...")
        await conn.run_sync(Base.metadata.drop_all)
        print("🧬 Criando novas tabelas...")
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session_maker() as db:
        # 1. Usuários
        print("👤 Criando usuários padrão...")
        users_data = [
            {"email": "admin@admin.com", "pass": "admin123", "name": "Administrador Master", "role": UserRole.ADMIN},
            {"email": "gestor@admin.com", "pass": "gestor123", "name": "Gestor de Equipe", "role": UserRole.GESTOR},
            {"email": "pa@pa.com", "pass": "pa123", "name": "Secretária P.A.", "role": UserRole.SEC_PA},
            {"email": "ue@ue.com", "pass": "ue123", "name": "Secretária UE-SUS", "role": UserRole.SEC_UE_SUS},
            {"email": "portaria@portaria.com", "pass": "portaria123", "name": "Portaria Principal", "role": UserRole.SEC_PORTARIA},
        ]
        for u in users_data:
            db.add(User(email=u["email"], hashed_password=get_password_hash(u["pass"]), full_name=u["name"], role=u["role"], is_active=True))
        
        await db.flush()

        # 2. Convênios (Dinâmico via Imagens)
        print("🖼️ Semeando convênios a partir da pasta /img...")
        img_dir = 'frontend/public/img'
        available_logos = [f for f in os.listdir(img_dir) if f.endswith('94.png')]
        
        # Mapeamento de nome amigável
        logo_to_name = {
            "abramge94.png": "ABRAMGE",
            "amagis94.png": "AMAGIS",
            "cassi94.png": "CASSI",
            "copass94.png": "COPASS",
            "ipsemg94.png": "IPSEMG",
            "ipsm94.png": "IPSM",
            "plancel94.png": "PARTICULAR",
            "postalsaude94.png": "POSTAL SAÚDE",
            "renal94.png": "RENAL",
            "sepasi94.png": "SEPASI",
            "sicoob94.png": "SICOOB",
            "sus94.png": "S.U.S.",
            "unimed94.png": "UNIMED"
        }

        created_plans = {}
        for logo in available_logos:
            name = logo_to_name.get(logo, logo.split('94.png')[0].upper())
            plan = HealthPlan(name=name, logo_path=f"/img/{logo}")
            db.add(plan)
            await db.flush()
            created_plans[name] = plan

        # 3. TUSS (Consumindo XLS)
        print("📈 Iniciando importação massiva de códigos TUSS...")
        await import_tuss_from_xls(db)

        # 4. Guias SPDATA (Configuração Inicial)
        print("📘 Configurando guias de treinamento por setor...")
        guides = [
            {"sector": SectorType.UE_SUS, "type": GuidesPatientType.EXTERNO, "title": "Atendimento SUS (CNS)", "content": "1. Pesquisar CNS.\n2. Módulo Recepção > Atendimento SUS.", "order": 1},
            {"sector": SectorType.PA, "type": GuidesPatientType.EXTERNO, "title": "Abertura P.A. Convênio", "content": "1. Consultar Elegibilidade.\n2. Lançar no Sistema SPDATA.", "order": 1},
            {"sector": SectorType.PORTARIA, "type": GuidesPatientType.INTERNO, "title": "Protocolo de Visitas", "content": "1. Identificar Visitante.\n2. Liberar no Sistema de Acesso.", "order": 1},
        ]
        for g in guides:
            db.add(SPDATAGuide(sector=g["sector"], patient_type=g["type"], title=g["title"], content=g["content"], order_index=g["order"]))

        # 5. Protocolos (Exemplos)
        print("📜 Criando protocolos básicos (UNIMED/IPSEMG)...")
        if "UNIMED" in created_plans:
            db.add(AttendanceProtocol(health_plan_id=created_plans["UNIMED"].id, patient_type=PatientType.EXTERNO, title="Abertura de Guia Unimed", content="Regras de autorização biométrica e visual."))
        if "IPSEMG" in created_plans:
            db.add(AttendanceProtocol(health_plan_id=created_plans["IPSEMG"].id, patient_type=PatientType.EXTERNO, title="Validação IPSEMG", content="Verificar habilitação no portal GRP."))

        await db.commit()
        print("✅ Semeadura V4 Concluída!")

if __name__ == "__main__":
    asyncio.run(seed_data())
