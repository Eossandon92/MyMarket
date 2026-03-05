import pandas as pd
import sys

def debug_excel(filepath):
    try:
        if filepath.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath, engine="openpyxl")
            
        print("Raw Columns:", df.columns.tolist())
        
        # What do the first few rows look like for those columns?
        for col in df.columns:
            if "STOCK" in str(col).upper() or "PRECIO" in str(col).upper():
                print(f"Sample data for {col}:", df[col].head(3).tolist())
                
    except Exception as e:
        print("Error reading:", str(e))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        debug_excel(sys.argv[1])
    else:
        print("Provide path to excel file")
