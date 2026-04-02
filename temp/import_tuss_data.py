import asyncio
import pandas as pd
import os
import sys

# Add the project root to sys.path to import app modules
sys.path.append(os.getcwd())

from app.core.database import async_session_maker
from app.modules.tuss.models import TUSSCode
from sqlalchemy import delete

async def import_tuss():
    file_path = 'temp/Codigos TUSS.xls'
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        print(f"Reading {file_path}...")
        # Reading XLS, skipping the first 10 rows as per inspection
        df = pd.read_excel(file_path, skiprows=10)
        
        # We assume first col is code and second is description based on 'inspect_tuss.py'
        # Let's be safer and pick the first two non-empty columns if unnamed
        # In the previous inspection row 10 had: Unnamed: 0 = 10103023, Unnamed: 1 = description
        
        # Filter to keep only rows with numeric codes (TUSS codes are numbers)
        # Drop rows where first column is not numeric or NaN
        df = df.dropna(subset=[df.columns[0], df.columns[1]])
        
        # Convert first column to string and remove .0 if it's a float
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

        print(f"Found {len(records)} valid TUSS records.")

        async with async_session_maker() as db:
            # Optional: Clear existing codes
            # await db.execute(delete(TUSSCode))
            
            # Batch insert
            for i in range(0, len(records), 100):
                batch = records[i:i+100]
                db_objects = [TUSSCode(code=r["code"], description=r["description"]) for r in batch]
                db.add_all(db_objects)
                await db.flush()
                print(f"Imported {i + len(batch)} / {len(records)}...")

            await db.commit()
            print("Import finished successfully!")

    except Exception as e:
        print(f"Error during import: {e}")

if __name__ == "__main__":
    asyncio.run(import_tuss())
