from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class MockupHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/u/"):
            relative_asset_prefixes = ("/u/assets/",)
            relative_asset_files = {
                "/u/app.js": "/app.js",
                "/u/styles.css": "/styles.css",
            }
            if self.path in relative_asset_files:
                self.path = relative_asset_files[self.path]
            elif self.path.startswith(relative_asset_prefixes):
                self.path = self.path[2:]
            else:
                index_html = Path("index.html").read_text(encoding="utf-8")
                index_html = index_html.replace("<head>", '<head><base href="/">', 1)
                encoded = index_html.encode("utf-8")
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
                return
        return super().do_GET()


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    import os

    os.chdir(root)
    ThreadingHTTPServer(("127.0.0.1", 8765), MockupHandler).serve_forever()
