import sys
import os

# Añadir la carpeta 'src' al principio del path para priorizarla sobre la carpeta 'api' de Vercel
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from app import app
except ImportError as e:
    print(f"Error al importar la app: {e}")
    raise e

# Middleware para asegurar que las rutas funcionen correctamente en Vercel
# Si Vercel quita el prefijo /api, este código se asegura de que Flask lo reciba
class PrefixMiddleware(object):
    def __init__(self, app, prefix=''):
        self.app = app
        self.prefix = prefix
    def __call__(self, environ, start_response):
        if environ['PATH_INFO'].startswith(self.prefix):
            return self.app(environ, start_response)
        else:
            environ['PATH_INFO'] = self.prefix + environ['PATH_INFO']
            environ['SCRIPT_NAME'] = self.prefix
            return self.app(environ, start_response)

# Aplicar el middleware a la aplicación
app.wsgi_app = PrefixMiddleware(app.wsgi_app, prefix='/api')
