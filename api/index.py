import sys
import os
import traceback

# Configuración de rutas
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src_path = os.path.join(path, 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

try:
    from app import app as flask_app
except Exception:
    flask_app = None
    import_error = traceback.format_exc()

def app(environ, start_response):
    # Endpoint de prueba directa (sin pasar por Flask)
    if environ.get('PATH_INFO') == '/api/test' or environ.get('PATH_INFO') == '/test':
        start_response('200 OK', [('Content-Type', 'application/json')])
        return [b'{"status": "alive", "message": "El puente de Vercel funciona correctamente"}']

    # Si hubo error al importar Flask, lo mostramos en el navegador
    if flask_app is None:
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"Error al importar la aplicacion Flask:\n\n{import_error}".encode('utf-8')]

    # Intentar ejecutar Flask con captura de errores
    try:
        # Asegurar que el PATH_INFO tenga el prefijo que Flask espera
        path = environ.get('PATH_INFO', '')
        if not path.startswith('/api'):
            environ['PATH_INFO'] = '/api' + path
            
        return flask_app(environ, start_response)
    except Exception:
        error_msg = traceback.format_exc()
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"Error durante la ejecucion de Flask:\n\n{error_msg}".encode('utf-8')]
