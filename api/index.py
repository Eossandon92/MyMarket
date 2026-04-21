import sys
import os

# Añadir la carpeta 'src' al path
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src_path = os.path.join(path, 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

try:
    from app import app
except Exception as e:
    print(f"Error importando app: {e}")
    raise e

# Middleware para asegurar que Flask reciba el prefijo /api
# Esto arregla el error de "Unexpected end of JSON input" que suele ser un 404 oculto
class VercelPathFix(object):
    def __init__(self, app):
        self.app = app
    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        if not path.startswith('/api'):
            environ['PATH_INFO'] = '/api' + path
        return self.app(environ, start_response)

app.wsgi_app = VercelPathFix(app.wsgi_app)
