"""Write web/data.js — a static snapshot of the latest cycle and history so the
site also works opened straight from disk (file://), without the server. When
served, app.js prefers the live /api endpoints and ignores this."""
import json
import os

from config import RESULTS_DIR, ROOT
from cycle.history import load_history


def build_site():
    latest = os.path.join(RESULTS_DIR, "latest.json")
    data = json.load(open(latest)) if os.path.exists(latest) else None
    snap = {"latest": data, "history": load_history()}
    out = os.path.join(ROOT, "web", "data.js")
    open(out, "w").write("window.__ATTEST_SNAPSHOT__ = "
                         + json.dumps(snap, ensure_ascii=False) + ";\n")
    return out
