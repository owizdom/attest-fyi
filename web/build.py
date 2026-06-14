"""Write web/data.js — a static snapshot of the latest cycle and history so the
site also works opened straight from disk (file://), without the server. When
served, app.js prefers the live /api endpoints and ignores this."""
import json
import os

from config import ROOT
from cycle.history import load_history, enrich_latest


def build_site():
    data = enrich_latest() or None
    snap = {"latest": data, "history": load_history()}
    out = os.path.join(ROOT, "web", "data.js")
    open(out, "w").write("window.__ATTEST_SNAPSHOT__ = "
                         + json.dumps(snap, ensure_ascii=False) + ";\n")
    return out
