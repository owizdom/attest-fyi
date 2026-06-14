#!/usr/bin/env python3
"""attest.fail web server. Stdlib only.

Serves the static site from web/ and a small JSON API:
  GET  /api/latest     latest cycle result
  GET  /api/history    every cycle, summarised for the chart
  POST /api/submit     queue a provider endpoint for testing
"""
import datetime
import json
import os
import socketserver
from http.server import BaseHTTPRequestHandler

from config import ROOT, RESULTS_DIR
from cycle.history import load_history

WEB = os.path.join(ROOT, "web")
SUBMISSIONS = os.path.join(ROOT, "submissions")

STATIC = {"/": "index.html", "/index.html": "index.html",
          "/style.css": "style.css", "/app.js": "app.js", "/data.js": "data.js"}
CONTENT = {".html": "text/html; charset=utf-8", ".css": "text/css",
           ".js": "application/javascript", ".json": "application/json"}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        b = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj, ensure_ascii=False))

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/latest":
            p = os.path.join(RESULTS_DIR, "latest.json")
            return self._json(json.load(open(p)) if os.path.exists(p) else {})
        if path == "/api/history":
            return self._json(load_history())
        if path in STATIC:
            fp = os.path.join(WEB, STATIC[path])
            if not os.path.exists(fp):
                return self._send(404, "not found", "text/plain")
            ext = os.path.splitext(fp)[1]
            return self._send(200, open(fp, "rb").read(),
                              CONTENT.get(ext, "application/octet-stream"))
        return self._json({"error": "not found"}, 404)

    def do_POST(self):
        if self.path == "/api/submit":
            n = int(self.headers.get("Content-Length", 0) or 0)
            try:
                data = json.loads(self.rfile.read(n) or b"{}")
            except Exception:
                return self._json({"error": "bad json"}, 400)
            os.makedirs(SUBMISSIONS, exist_ok=True)
            ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            data["received_at"] = datetime.datetime.now().isoformat(timespec="seconds")
            json.dump(data, open(os.path.join(SUBMISSIONS, "submission-%s.json" % ts), "w"),
                      indent=2)
            return self._json({"ok": True, "message": "endpoint queued for testing"})
        return self._json({"error": "not found"}, 404)

    def log_message(self, *a):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def serve(port=8787):
    httpd = Server(("127.0.0.1", port), Handler)
    print("attest.fail serving on http://127.0.0.1:%d" % port)
    httpd.serve_forever()


if __name__ == "__main__":
    serve()
