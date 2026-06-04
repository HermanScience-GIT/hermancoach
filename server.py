from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class MockupHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/u/"):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    import os

    os.chdir(root)
    ThreadingHTTPServer(("127.0.0.1", 8765), MockupHandler).serve_forever()
