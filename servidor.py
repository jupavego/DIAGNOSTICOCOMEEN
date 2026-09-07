"""
servidor.py - Servidor de desarrollo

  python servidor.py            sirve en http://localhost:8765

Existe por una sola razon: `python -m http.server` no manda cabeceras de
cache, y entonces el navegador aplica su propia heuristica y se queda con los
.js y .css viejos. index.html se revalida, el resto no, y uno termina viendo
media aplicacion nueva y media vieja sin entender por que.

Aqui todo se sirve con no-store: cada recarga trae los archivos de verdad.
En produccion no hace falta - Vercel ya manda 'max-age=0, must-revalidate'.
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class SinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, formato, *args):
        # Solo errores: el registro de cada archivo servido no aporta nada.
        if args and str(args[1]).startswith(('4', '5')):
            super().log_message(formato, *args)


if __name__ == '__main__':
    servidor = ThreadingHTTPServer(('127.0.0.1', PUERTO), partial(SinCache, directory='.'))
    print('Diagnostico COMEEN en http://localhost:%d' % PUERTO)
    print('  encuesta  http://localhost:%d/index.html' % PUERTO)
    print('  campo     http://localhost:%d/index.html?f=campo' % PUERTO)
    print('  panel     http://localhost:%d/index.html?vista=panel' % PUERTO)
    print('Ctrl+C para detener.')
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print('\nDetenido.')
