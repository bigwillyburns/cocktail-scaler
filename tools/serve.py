"""Local dev server for the web app.

Serves web/ with caching turned off, plus /__changes, which returns a number
that changes whenever a file in web/ changes. The app polls it on localhost
and reloads itself.

Usage: python tools/serve.py [port]
"""
import http.server
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


def latest_change():
    newest = 0
    for folder, _, files in os.walk(ROOT):
        for name in files:
            newest = max(newest, os.stat(os.path.join(folder, name)).st_mtime_ns)
    return str(newest)


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/__changes':
            body = latest_change().encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        if '/__changes' not in self.path:
            super().log_message(fmt, *args)


if __name__ == '__main__':
    print(f'Serving web/ at http://localhost:{PORT} (no caching, auto-reload)')
    http.server.ThreadingHTTPServer(('', PORT), DevHandler).serve_forever()
