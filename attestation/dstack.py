"""Attestation verifier for dstack/Phala-style confidential gateways
(RedPill, NEAR AI). Fetches the attestation report, structurally parses the
Intel TDX quote (tdx.py), runs full DCAP verification — signature chain to
Intel's SGX Root CA + TCB status (dcap.py) — and makes an honest model-binding
determination from what the quote actually measures.
"""
import time
import urllib.error
import urllib.parse

from config import load_key
from models._http import get
from .base import report
from . import tdx

try:
    from . import dcap
    _HAVE_DCAP = True
except Exception:
    _HAVE_DCAP = False


def _model_binding(att, served_model):
    """Do the measured values bind the model weights? For these gateways the
    measured boundary is the OS image + the compose config; LLM weights are
    loaded at runtime and no provider publishes a measurement->model reference,
    so there is no weight-level binding. Honest determination, not asserted."""
    info = att.get("info", {}) or {}
    compose = (info.get("tcb_info", {}) or {}).get("app_compose") or info.get("app_compose") or ""
    slug = (served_model or "").split("/")[-1].lower()
    referenced = bool(slug and slug in str(compose).lower())
    if referenced:
        return False, "model named in measured config, but weights load at runtime (config-bound, not weight-bound)"
    return False, "not bound — weights load outside the measured image; no published measurement-to-model reference"


def verify(cfg, ctx):
    base = cfg["base_url"].rstrip("/")
    key = load_key(cfg.get("key_env"))
    headers = {"Authorization": "Bearer " + key} if key else {}
    url = base + "/attestation/report"
    mp = cfg.get("model_param")
    if mp:
        url += "?model=" + urllib.parse.quote(mp, safe="/")

    rep, last = None, None
    for _ in range(3):
        try:
            rep = get(url, headers, timeout=30)
            break
        except urllib.error.HTTPError as e:
            last = "attestation endpoint HTTP %d" % e.code
            if e.code < 500:
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

    d = {"root_trusted": False, "tcb_status": "unknown"}
    if _HAVE_DCAP:
        try:
            d = dcap.verify(quote)
        except Exception as e:
            d = {"root_trusted": False, "tcb_status": "unknown", "error": str(e)[:60]}
    root_trusted = bool(d.get("root_trusted"))
    tcb = d.get("tcb_status", "unknown")
    bound, bind_reason = _model_binding(att, ctx.get("model"))

    m = v["measurements"]
    notes = [
        "Intel TDX v4 quote, QE vendor %s" % ("Intel verified" if v["intel_qe"] else "UNKNOWN"),
        "DCAP signature chain to Intel SGX Root CA: %s" % ("VERIFIED" if root_trusted else "not verified"),
        "TCB status: %s" % tcb,
        "report_data binds gateway key: %s" % ("yes" if v["binds_key"] else "no"),
        "model binding: %s" % bind_reason,
        "MRTD %s…" % m["mrtd"][:24],
    ]
    r = report(
        present=True,
        signature_valid=v["well_formed"],
        root_trusted=root_trusted,
        freshness_ok=bool(nonce),
        channel_bound=v["binds_key"],
        binds_model=bound,
        vendor="intel-tdx",
        notes=notes,
    )
    r["measurements"] = m
    r["signing_address"] = signing
    r["tcb_status"] = tcb
    r["fmspc"] = d.get("fmspc")
    return r
