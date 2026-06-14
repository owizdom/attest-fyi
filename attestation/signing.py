"""Trustless behavioural binding via per-response signatures.

dstack gateways (RedPill) sign each response with a node key whose address the
node's TDX quote binds (report_data == signing address). The gateway load-balances
across a small node pool, so we:

  1. collect the pool — fetch the attestation endpoint a few times, mapping each
     node's signing address to whether its quote roots to Intel (dcap);
  2. run signed probes — for each, recover the signer from the response signature
     and require it to be a pool node whose quote is Intel-rooted.

A verified sample is then a response cryptographically produced by an
Intel-attested enclave — so the behavioural transcript is trustless, not merely
"as submitted". Anyone can re-recover the signers from the stored bytes offline.
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from config import load_key
from .eth_sig import recover_eth_personal
from . import dcap


def _post(url, key, body, timeout=40):
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + key,
                                          "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def _get(url, key, timeout=30):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + key})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def collect_pool(att_cfg, n=6):
    """Map signing address -> {root_trusted, intel_quote} across the node pool."""
    base = att_cfg["base_url"].rstrip("/")
    key = load_key(att_cfg.get("key_env"))
    url = base + att_cfg.get("path", "/attestation/report")
    mp = att_cfg.get("model_param")
    if mp:
        url += "?model=" + urllib.parse.quote(mp, safe="")
    pool = {}
    for _ in range(n):
        try:
            d = _get(url, key)
        except Exception:
            continue
        wrap = att_cfg.get("wrapped")
        a = d.get(wrap) if (wrap and isinstance(d.get(wrap), dict)) else d
        addr, q = a.get("signing_address"), a.get("intel_quote")
        if addr and q and addr.lower() not in pool:
            try:
                rt = bool(dcap.verify(q).get("root_trusted"))
            except Exception:
                rt = False
            pool[addr.lower()] = {"root_trusted": rt, "intel_quote": q}
    return pool


def _sample_ok(sample, pool):
    addr = (sample.get("signing_address") or "").lower()
    rec = recover_eth_personal(sample.get("text"), sample.get("signature"))
    node = pool.get(addr)
    return bool(rec) and rec.lower() == addr and bool(node) and node.get("root_trusted")


def signed_check(served, sign_cfg, att_cfg, prompts, retries=5):
    """Make a signed call per prompt, recover the signer, and require it to be an
    Intel-rooted pool node. Returns the verified count + offline-reproducible
    evidence (samples + the pool quotes)."""
    pool = collect_pool(att_cfg)
    base = served["base_url"].rstrip("/")
    key = load_key(served.get("key_env"))
    model = served["model"]
    mp = sign_cfg.get("model_param") or model
    path = sign_cfg.get("path", "/signature/{id}")
    samples = []
    for p in prompts:
        try:
            d = _post(base + "/chat/completions", key,
                      {"model": model, "messages": [{"role": "user", "content": p}],
                       "max_tokens": sign_cfg.get("max_tokens", 64), "temperature": 0})
        except Exception:
            continue
        rid = d.get("id")
        url = base + path.replace("{id}", str(rid)) + "?model=" + urllib.parse.quote(mp, safe="")
        sig = None
        for _ in range(retries):
            try:
                sig = _get(url, key)
                break
            except urllib.error.HTTPError:
                time.sleep(1.5)
            except Exception:
                break
        if not sig or not sig.get("text"):
            continue
        samples.append({"text": sig.get("text"), "signature": sig.get("signature"),
                        "signing_address": sig.get("signing_address")})
    verified = sum(1 for s in samples if _sample_ok(s, pool))
    return {"format": sign_cfg.get("format", "eth_personal"),
            "verified": verified, "total": len(samples),
            "samples": samples,
            "pool": {a: {"root_trusted": v["root_trusted"]} for a, v in pool.items()},
            "pool_quotes": {a: v["intel_quote"] for a, v in pool.items()}}


def reverify_signed(signed):
    """Offline re-verification (attest.py verify): re-recover every signer and
    re-root every pool quote to Intel from the stored bytes. Returns (ok, total)."""
    samples = (signed or {}).get("samples") or []
    quotes = (signed or {}).get("pool_quotes") or {}
    pool = {}
    for a, q in quotes.items():
        try:
            pool[a.lower()] = {"root_trusted": bool(dcap.verify(q).get("root_trusted"))}
        except Exception:
            pool[a.lower()] = {"root_trusted": False}
    ok = sum(1 for s in samples if _sample_ok(s, pool))
    return ok, len(samples)
