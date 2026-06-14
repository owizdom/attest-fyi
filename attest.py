#!/usr/bin/env python3
"""attest.fyi engine CLI. Run from the repo root.

  python3 attest.py build-ref --adapter ollama --model llama3.2:1b-instruct-q8_0
  python3 attest.py run

The web app (web/, Next.js) reads results/ directly; it is not started here.
"""
import argparse
import sys

from config import DEFAULT_SEED
from probes.suite import generate
from models.factory import make_client
from references.registry import build_reference


def cmd_build_ref(a):
    spec = {"adapter": a.adapter, "model": a.model}
    if a.host:
        spec["host"] = a.host
    if a.base_url:
        spec["base_url"] = a.base_url
    if a.key_env:
        spec["key_env"] = a.key_env
    if a.thinking_budget is not None:
        spec["thinking_budget"] = a.thinking_budget
    client = make_client(spec)
    probes = generate(a.seed)
    decoding = {"temperature": 0.0, "max_tokens": a.max_tokens, "seed": 42}
    ref = build_reference(client, probes, decoding, a.model, a.seed)
    print("reference: %s" % a.model)
    print("  probes=%d  null_exact=%.2f  null_sim=%.2f  errors=%d"
          % (len(probes), ref["null_exact"], ref["null_sim"], ref["errors"]))
    if ref["errors"]:
        print("  !! errors present; reference not trustworthy", file=sys.stderr)


def cmd_run(a):
    from cycle.runner import run_cycle
    print("running cycle (seed=%d) ..." % a.seed)
    res = run_cycle(seed=a.seed)
    s = res["summary"]
    print("\ncycle %d  trust-gap=%d%%  pass=%d partial=%d fail=%d skipped=%d"
          % (res["cycle"], s["trust_gap_pct"], s["pass"], s["partial"],
             s["fail"], s["skipped"]))


def cmd_verify(a):
    from attestation.reverify import verify_published
    rows = verify_published()
    mark = {"ok": "✓", "MISMATCH": "✗", "skip": "·"}
    for pid, status, detail in rows:
        print("  %s %-10s %s" % (mark[status], pid, detail))
    okc = sum(1 for _, s, _ in rows if s == "ok")
    tot = sum(1 for _, s, _ in rows if s in ("ok", "MISMATCH"))
    print("\n%d/%d published seals reproduced from evidence (offline, no keys)." % (okc, tot))
    if okc != tot:
        sys.exit(1)


def cmd_audit(a):
    import json
    import os
    from config import PROVIDERS_DIR, ROOT
    from probes.suite import generate
    from cycle.runner import audit_one, write_evidence
    path = a.provider if os.path.exists(a.provider) else os.path.join(PROVIDERS_DIR, a.provider + ".json")
    if not os.path.exists(path):
        print("no manifest for %r — pass a providers/<id> name or a path to a manifest .json"
              % a.provider, file=sys.stderr)
        sys.exit(2)
    m = json.load(open(path))
    print("auditing %s ..." % m["id"])
    row, ev = audit_one(m, generate(a.seed), seed=a.seed)
    write_evidence(m["id"], ev)
    subdir = os.path.join(ROOT, "submissions")
    os.makedirs(subdir, exist_ok=True)
    json.dump({"provider": m["id"], "verdict": row.get("verdict"), "score": row.get("score"),
               "manifest": m, "row": row},
              open(os.path.join(subdir, m["id"] + ".json"), "w"), indent=2)
    print("\n  verdict: %s   score=%s" % (row.get("verdict"), row.get("score")))
    det = (row.get("identity") or {}).get("detail") or ""
    if det:
        print("  %s" % det)
    print("\n  wrote submissions/%s.json + results/evidence/%s.json" % (m["id"], m["id"]))
    print("  to publish to the board:")
    print("    1. add your manifest at providers/%s.json (if it is new)" % m["id"])
    print("    2. commit and open a PR titled 'verify: %s'" % m["id"])
    print("    3. CI re-verifies the seal from your evidence; on merge you are credited.")


def main():
    p = argparse.ArgumentParser(prog="attest.py")
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("build-ref", help="build a reference fingerprint")
    r.add_argument("--adapter", required=True, choices=["ollama", "gemini", "openai_compat"])
    r.add_argument("--model", required=True)
    r.add_argument("--host")
    r.add_argument("--base-url", dest="base_url")
    r.add_argument("--key-env", dest="key_env")
    r.add_argument("--thinking-budget", dest="thinking_budget", type=int)
    r.add_argument("--max-tokens", dest="max_tokens", type=int, default=256)
    r.add_argument("--seed", type=int, default=DEFAULT_SEED)
    r.set_defaults(func=cmd_build_ref)

    c = sub.add_parser("run", help="run a benchmark cycle over providers/")
    c.add_argument("--seed", type=int, default=DEFAULT_SEED)
    c.set_defaults(func=cmd_run)

    v = sub.add_parser("verify", help="re-verify published seals from results/evidence (offline, no keys)")
    v.set_defaults(func=cmd_verify)

    au = sub.add_parser("audit", help="audit ONE provider and write a publishable bundle")
    au.add_argument("provider", help="a providers/<id> name, or a path to a manifest .json")
    au.add_argument("--seed", type=int, default=DEFAULT_SEED)
    au.set_defaults(func=cmd_audit)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
