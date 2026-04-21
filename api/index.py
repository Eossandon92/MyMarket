import sys
import os

# Añadir la carpeta 'src' al principio del path para priorizarla sobre la carpeta 'api' de Vercel
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from app import app
except ImportError as e:
    print(f"Error al importar la app: {e}")
    raise e

# Vercel espera una variable llamada 'app' para ejecutar Flask
# No es necesario ejecutar app.run() aquí
