from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "application/javascript", ".css": "text/css"}

print("TeleCod running at http://localhost:8080")
print("Open http://localhost:8080/index.html")
ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
