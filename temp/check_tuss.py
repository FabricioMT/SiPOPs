import pandas as pd
import json

try:
    df = pd.read_excel('temp/Codigos TUSS.xls')
    # print the columns
    print("Columns:", list(df.columns))
    
    # print the first 5 records as JSON
    print("\nData:")
    print(df.head(5).to_json(orient='records', force_ascii=False, indent=2))
except Exception as e:
    print(f"Error reading with default engine, trying alternative: {e}")
    try:
        # maybe it's html?
        tables = pd.read_html('temp/Codigos TUSS.xls')
        if tables:
            df = tables[0]
            print("Columns (HTML):", list(df.columns))
            print(df.head().to_json(orient='records', force_ascii=False, indent=2))
        else:
            print("No tables found in HTML")
    except Exception as e2:
        print(f"Error reading as HTML: {e2}")
