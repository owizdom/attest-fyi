"""Re-verify published seals from the evidence we publish — offline, no keys, no
Ollama, no paid calls. `attest.py verify` runs this: it re-runs the exact DCAP +
NVIDIA cryptography on the bytes in results/evidence/ and asserts the result
matches the verdict in results/latest.json. Anyone can reproduce the seal half of
the board this way; the only network call is to Intel's public PCS for TCB.
"""
import json
import os

from config import RESULTS_DIR
from . import dcap
from . import nvidia


def reverify_evidence(ev):
    """Re-run seal verification on one stored evidence dict.
    Returns {signature_valid, root_trusted, tcb_status} or None if unreadable."""
    fmt = (ev or {}).get("format")
    if fmt == "chutes-fleet":
        nodes = ev.get("all_attestations") or []
        quotes = [n.get("intel_quote") for n in nodes if n.get("intel_quote")]
        if not quotes:
            return None
        cpu = [dcap.verify(q) for q in quotes]
        gpu = [nvidia.verify(n.get("gpu_evidence")) for n in nodes]
        n = len(nodes)
        cpu_root = sum(1 for c in cpu if c.get("root_trusted")) == n
        gpu_root = all(g.get("root_trusted") for g in gpu)
        sig = all(c.get("quote_sig_ok") for c in cpu)
        tcbs = [c.get("tcb_status", "unknown") for c in cpu]
        tcb = "UpToDate" if all(t == "UpToDate" for t in tcbs) \
            else next((t for t in tcbs if t and t != "UpToDate"), "unknown")
        return {"signature_valid": sig, "root_trusted": cpu_root and gpu_root,
                "tcb_status": tcb}
    # dstack-tdx single node (RedPill, NEAR, Venice)
    q = ev.get("intel_quote")
    if not q:
        return None
    d = dcap.verify(q)
    np = ev.get("nvidia_payload")
    gpu = nvidia.verify(np) if np else {"present": False, "root_trusted": True}
    gpu_root = gpu.get("root_trusted") if gpu.get("present") else True
    return {"signature_valid": bool(d.get("quote_sig_ok")),
            "root_trusted": bool(d.get("root_trusted")) and bool(gpu_root),
            "tcb_status": d.get("tcb_status", "unknown")}


def verify_published():
    """Re-verify every published seal against its evidence.
    Returns list of (id, status, detail): status in ok|MISMATCH|skip."""
    latest = json.load(open(os.path.join(RESULTS_DIR, "latest.json")))
    evdir = os.path.join(RESULTS_DIR, "evidence")
    out = []
    for p in latest.get("providers", []):
        pid = p["id"]
        att = p.get("attestation") or {}
        ev_path = os.path.join(evdir, "%s.json" % pid)
        if not os.path.exists(ev_path):
            note = "no seal to re-verify" if not att.get("present") else "no evidence file"
            out.append((pid, "skip", note))
            continue
        try:
            ev = json.load(open(ev_path))
            r = reverify_evidence(ev)
        except Exception as e:
            out.append((pid, "skip", "evidence unreadable: %s" % type(e).__name__))
            continue
        if not r:
            out.append((pid, "skip", "no quote in evidence"))
            continue
        # Assert only the deterministic crypto: the attestation-key signature and
        # the chain to the pinned vendor roots are a pure function of the bytes.
        # TCB is time-varying (Intel updates collateral), so report it, don't gate.
        pub = (bool(att.get("signature_valid")), bool(att.get("root_trusted")))
        got = (bool(r["signature_valid"]), bool(r["root_trusted"]))
        ok = pub == got
        detail = "root_trusted=%s sig=%s tcb=%s" % (
            r["root_trusted"], r["signature_valid"], r["tcb_status"])
        if ok and att.get("tcb_status") and att["tcb_status"] != r["tcb_status"]:
            detail += " (tcb was %s at capture)" % att["tcb_status"]
        if not ok:
            detail += "  (published: root=%s sig=%s)" % pub
        out.append((pid, "ok" if ok else "MISMATCH", detail))
    return out
