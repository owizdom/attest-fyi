"""Attestation verifier for dstack/Phala-style confidential gateways
(RedPill, NEAR AI, and other Phala dstack deployments).

Fetches GET {base}/attestation/report, finds the Intel TDX quote (top-level or
under a wrapper key like `gateway_attestation`), and verifies it with tdx.py.
The gateway attestation is fetchable without inference, so a provider can be
seal-audited even when its inference is unavailable.
"""
import time
import urllib.error
import urllib.parse

from config import load_key
from models._http import get
from .base import report
from . import tdx


def verify(cfg, ctx):
    base = cfg["base_url"].rstrip("/")
    key = load_key(cfg.get("key_env"))
    headers = {"Authorization": "Bearer " + key} if key else {}
    url = base + "/attestation/report"
    mp = cfg.get("model_param")  # some gateways (RedPill) require ?model=<slug>
    if mp:
        url += "?model=" + urllib.parse.quote(mp, safe="/")
    rep, last = None, None
    for attempt in range(3):  # the seal is stable infra; retry transient failures
        try:
            rep = get(url, headers, timeout=30)
            break
        except urllib.error.HTTPError as e:
            last = "attestation endpoint HTTP %d" % e.code
            if e.code < 500:  # 4xx won't fix on retry
                break
        except Exception as e:
            last = "attestation fetch failed: %s" % type(e).__name__
        time.sleep(1.5)
    if rep is None:
        return report(present=False, vendor="intel-tdx", notes=[last or "attestation fetch failed"])

    wrap = cfg.get("wrapped")
    att = rep.get(wrap) if (wrap and isinstance(rep.get(wrap), dict)) else rep
    quote = att.get("intel_quote")
    signing = att.get("signing_address")
    nonce = att.get("request_nonce")
    if not quote:
        return report(present=False, vendor="intel-tdx", notes=["no intel_quote in report"])

    try:
        v = tdx.verify(quote, signing)
    except Exception as e:
        return report(present=True, signature_valid=False, vendor="intel-tdx",
                      notes=["quote parse failed: %s" % type(e).__name__])

    m = v["measurements"]
    notes = [
        "Intel TDX v4 quote, QE vendor %s" % ("Intel verified" if v["intel_qe"] else "UNKNOWN"),
        "MRTD %s…" % m["mrtd"][:24],
        "report_data binds gateway key: %s" % ("yes" if v["binds_key"] else "no"),
        "Intel DCAP root chain + TCB status: not yet verified",
        "model binding (measurement to weights): not yet verified",
    ]
    r = report(
        present=True,
        signature_valid=v["well_formed"],
        root_trusted=False,
        freshness_ok=bool(nonce),
        channel_bound=v["binds_key"],
        binds_model=False,
        vendor="intel-tdx",
        notes=notes,
    )
    r["measurements"] = m
    r["signing_address"] = signing
    return r
