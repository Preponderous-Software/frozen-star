"""Serve Frozen Star on this PC only, so a browser never runs an old copy.

    py -3 tools/serve.py <folder> <port> [--open URL] [--probe-dir DIR]

Each start picks a version stamp and rewrites index.html so the game loads from
/v<stamp>/..., a path that maps back onto the real files. Every launch therefore
uses fresh URLs, and the browser cannot reuse modules cached by an older version.
The origin stays the same, so saved progress is kept. Responses are no-store.
Windows Python can map .js to text/plain from the registry; this forces the right types.
With --probe-dir, the page's playtester probe (?probe) posts state.json and events.jsonl here.
"""
import json
import os
import functools
import http.server
import re
import sys
import time
import webbrowser

TYPES = {".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml"}


def make_handler(stamp, probe_dir=None):
    prefix = f"/v{stamp}/"

    class Handler(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TYPES}

        def translate_path(self, path):
            if path.startswith(prefix):
                path = "/" + path[len(prefix):]
            return super().translate_path(path)

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_GET(self):
            bare = self.path.split("?", 1)[0].split("#", 1)[0]
            if bare in ("/", "/index.html"):
                with open(self.translate_path("/index.html"), "r", encoding="utf-8") as f:
                    html = f.read()
                html = re.sub(r'(href|src)="(?!https?:|data:|#)([^"]+)"', lambda m: f'{m.group(1)}="{prefix}{m.group(2).lstrip("./")}"', html)
                html = html.replace('"./vendor/', f'"{prefix}vendor/')
                body = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            super().do_GET()

        def do_POST(self):
            if not probe_dir or self.path not in ("/__probe/state", "/__probe/event"):
                self.send_error(404); return
            n = min(int(self.headers.get("Content-Length") or 0), 1 << 20)
            try:
                body = json.loads(self.rfile.read(n) or b"{}")
                if self.path == "/__probe/state":
                    tmp = os.path.join(probe_dir, ".state.json.tmp")
                    with open(tmp, "w", encoding="utf-8") as f:
                        json.dump(body, f)
                    os.replace(tmp, os.path.join(probe_dir, "state.json"))  # atomic for readers
                else:
                    with open(os.path.join(probe_dir, "events.jsonl"), "a", encoding="utf-8") as f:
                        f.write(json.dumps(body) + "\n")
            except (ValueError, OSError):
                pass  # the probe never takes the game down
            self.send_response(204); self.end_headers()

        def log_message(self, fmt, *args):  # keep the window quiet
            pass

    return Handler


def main():
    folder, port = sys.argv[1], int(sys.argv[2])
    url = sys.argv[sys.argv.index("--open") + 1] if "--open" in sys.argv else None
    probe_dir = sys.argv[sys.argv.index("--probe-dir") + 1] if "--probe-dir" in sys.argv else None
    if probe_dir:
        os.makedirs(probe_dir, exist_ok=True)
    stamp = str(int(time.time()))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(make_handler(stamp, probe_dir), directory=folder))
    print(f"Frozen Star is running at http://127.0.0.1:{port}/")
    print("Close this window to stop it.")
    if url:
        webbrowser.open(url)
    server.serve_forever()


if __name__ == "__main__":
    main()
