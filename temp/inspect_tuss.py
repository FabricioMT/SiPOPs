import pandas as pd
import sqlite3
import os

def clean_and_import():
    file_path = 'temp/Codigos TUSS.xls'
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        # Load the XLS
        df = pd.read_excel(file_path)
        
        # Look for columns that look like Code and Description
        # Often TUSS files have headers in row 1-5. 
        # Let's try to find rows where the first column is numeric (TUSS code)
        
        # Basic cleanup: remove rows where first column is NaN
        df = df.dropna(subset=[df.columns[0]])
        
        # Rename columns for clarity (assuming col 0 is code and col 1 is description)
        # We need to verify this. 
        print("First 10 rows after dropping NaN in first col:")
        print(df.head(10).to_string())
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clean_and_import()
