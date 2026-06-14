#!/usr/bin/env python3
"""attest.fail engine CLI. Run from the repo root.

  python3 attest.py build-ref --adapter ollama --model llama3.2:1b-instruct-q8_0
  python3 attest.py run
  python3 attest.py build-site
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
    if a.build_site:
        from web.build import build_site
        build_site()
        print("snapshot written -> web/data.js")


def cmd_build_site(a):
    from web.build import build_site
    out = build_site()
    print("snapshot written -> %s" % out)


def cmd_serve(a):
    from web.build import build_site
    build_site()
    from server import serve
    serve(a.port)


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
    c.add_argument("--no-build-site", dest="build_site", action="store_false")
    c.set_defaults(func=cmd_run, build_site=True)

    b = sub.add_parser("build-site", help="write web/data.js snapshot for file:// use")
    b.set_defaults(func=cmd_build_site)

    sv = sub.add_parser("serve", help="run the web server (site + JSON API)")
    sv.add_argument("--port", type=int, default=8787)
    sv.set_defaults(func=cmd_serve)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
