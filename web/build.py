"""Embed results/latest.json into web/index.html so the leaderboard renders
real data while staying a single self-contained file (no fetch, no server)."""
import json
import os
import re

from config import RESULTS_DIR, WEB_INDEX

MARKER = re.compile(
    r'(<script id="attest-data"[^>]*>)(.*?)(</script>)', re.DOTALL)


def build_site():
    latest = os.path.join(RESULTS_DIR, "latest.json")
    data = json.load(open(latest)) if os.path.exists(latest) else None
    html = open(WEB_INDEX).read()
    payload = json.dumps(data, ensure_ascii=False) if data else "null"
    if not MARKER.search(html):
        raise RuntimeError('web/index.html is missing the <script id="attest-data"> hook')
    html = MARKER.sub(lambda m: m.group(1) + payload + m.group(3), html)
    open(WEB_INDEX, "w").write(html)
    return WEB_INDEX
