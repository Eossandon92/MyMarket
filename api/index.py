import sys
import os

# Asegurar que la carpeta 'src' y la raíz estén en el path
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src_path = os.path.join(path, 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)
if path not in sys.path:
    sys.path.insert(1, path)

try:
    from app import app
    print("App importada exitosamente")
except Exception as e:
    print(f"ERROR CRÍTICO AL IMPORTAR APP: {e}")
    raise e

# No usamos el middleware por ahora para descartar errores de ruteo
# Vercel debería pasar la ruta completa según vercel.json
