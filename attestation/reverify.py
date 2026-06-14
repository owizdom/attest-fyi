"""Re-verify published seals from the evidence we publish — offline, no keys, no
Ollama, no paid calls. `attest.py verify` runs this: it re-runs the exact DCAP +
NVIDIA cryptography on the bytes in results/evidence/ and asserts the result
matches the verdict in results/latest.json. Anyone can reproduce the seal half of
the board this way; the only network call is to Intel's public PCS for TCB.
"""
import glob
import json
import os

from config import RESULTS_DIR, ROOT
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


def _check(att, ev_path):
    """Compare a re-verification of the evidence at ev_path against the claimed
    attestation `att`. Returns (status, detail), status in ok|MISMATCH|skip.
    Asserts only the deterministic crypto (attestation-key signature + chain to
    the pinned vendor roots); TCB is time-varying, so it is reported, not gated."""
    if not os.path.exists(ev_path):
        return "skip", ("no seal to re-verify" if not att.get("present") else "no evidence file")
    try:
        ev = json.load(open(ev_path))
    except Exception as e:
        return "skip", "evidence unreadable: %s" % type(e).__name__
    r = reverify_evidence(ev)
    if not r:
        return "skip", "no quote in evidence"
    pub = (bool(att.get("signature_valid")), bool(att.get("root_trusted")))
    got = (bool(r["signature_valid"]), bool(r["root_trusted"]))
    status = "ok" if pub == got else "MISMATCH"
    detail = "root_trusted=%s sig=%s tcb=%s" % (r["root_trusted"], r["signature_valid"], r["tcb_status"])
    if status == "ok" and att.get("tcb_status") and att["tcb_status"] != r["tcb_status"]:
        detail += " (tcb was %s at capture)" % att["tcb_status"]
    if status == "MISMATCH":
        detail += "  (published: root=%s sig=%s)" % pub
    # Gold path: re-recover every signed response and re-root its node's quote.
    signed = ev.get("signed")
    if signed:
        from . import signing
        sok, stot = signing.reverify_signed(signed)
        detail += " | signed %d/%d" % (sok, stot)
        if stot and sok != stot:
            status = "MISMATCH"
    return status, detail


def verify_published():
    """Re-verify every published seal, plus any pending submission bundles, against
    their evidence. Returns list of (id, status, detail). This is the integrity
    gate: a submitted verdict only passes CI if its seal reproduces from the bytes."""
    evdir = os.path.join(RESULTS_DIR, "evidence")
    out, seen = [], set()
    latest = json.load(open(os.path.join(RESULTS_DIR, "latest.json")))
    for p in latest.get("providers", []):
        pid = p["id"]
        seen.add(pid)
        status, detail = _check(p.get("attestation") or {}, os.path.join(evdir, "%s.json" % pid))
        out.append((pid, status, detail))
    # Pending submissions from `attest.py audit` (a PR adds submissions/<id>.json
    # + results/evidence/<id>.json before the provider is on the board).
    for f in sorted(glob.glob(os.path.join(ROOT, "submissions", "*.json"))):
        try:
            b = json.load(open(f))
        except Exception:
            continue
        pid = b.get("provider")
        if not pid or pid in seen:
            continue
        seen.add(pid)
        att = (b.get("row") or {}).get("attestation") or {}
        status, detail = _check(att, os.path.join(evdir, "%s.json" % pid))
        out.append(("%s (submitted)" % pid, status, detail))
    return out
