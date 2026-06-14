"""Attestation verifier for Chutes-class confidential inference.

Chutes runs models inside Intel TDX VMs with NVIDIA confidential-computing GPUs.
NanoGPT resells this infrastructure: its /tee/attestation endpoint returns
`attestation_type: "chutes"` with the genuine quotes. Either way the report is a
*fleet* — an `all_attestations` list where every node carries:
  - `intel_quote`     : a base64 TDX v4 quote   -> dcap.py (now base64-aware)
  - `gpu_evidence`    : an NVIDIA device cert chain + SPDM blob -> nvidia.py
  - `e2e_pubkey`      : the enclave's end-to-end encryption key (channel binding)

We DCAP-verify every node's CPU quote to the Intel SGX Root CA AND verify every
node's GPU cert chain to NVIDIA's Device Identity CA. root_trusted requires BOTH.

Chutes' *own* API is handled separately (`opaque: true`): it returns only an
opaque verification token, no retrievable quote.
"""
import time
import urllib.error
import urllib.parse

from config import load_key
from models._http import get
from .base import report
from . import dcap
from . import nvidia

_NO_BIND = ("the TDX+GPU seal attests the Chutes node and its code, not which "
            "model weights answered — weights load from a registry outside the "
            "measured boundary, and no TEE model here is small enough to "
            "behaviourally reference, so model identity is not independently bound")


def _fetch(cfg):
    base = cfg["base_url"].rstrip("/")
    key = load_key(cfg.get("key_env"))
    headers = {"Authorization": "Bearer " + key} if key else {}
    url = base + cfg.get("path", "/tee/attestation")
    mp = cfg.get("model_param")
    if mp:
        url += "?model=" + urllib.parse.quote(mp, safe="/")
    return get(url, headers, timeout=45)


def verify(cfg, ctx):
    if cfg.get("opaque"):
        n = cfg.get("token_len", 32)
        return report(present=False, vendor="intel-tdx+nvidia", notes=[
            "Chutes' own API exposes no retrievable attestation: a chat response "
            "carries only an opaque %d-char `chutes_verification` token plus "
            "prompt/template SHA-256 — not a hardware quote, and nothing a client "
            "can independently check." % n,
            "The real, verifiable TDX + NVIDIA quotes for this exact hardware DO "
            "exist (NanoGPT resells Chutes and exposes them, and attest.fyi "
            "verifies them), but Chutes does not surface them to its own callers — "
            "its 'radical verifiability' attestation endpoint is, per its docs, "
            "still aspirational.",
        ])

    rep, last = None, None
    for _ in range(6):
        try:
            rep = _fetch(cfg)
            break
        except urllib.error.HTTPError as e:
            last = "attestation endpoint HTTP %d" % e.code
            if e.code in (401, 403, 404):
                break
        except Exception as e:
            last = "attestation fetch failed: %s" % type(e).__name__
        time.sleep(2)
    if rep is None:
        return report(present=False, vendor="intel-tdx+nvidia",
                      notes=[last or "attestation fetch failed"])

    fleet = rep.get("all_attestations") or []
    atype = rep.get("attestation_type")
    if not fleet:
        return report(present=False, vendor="intel-tdx+nvidia",
                      notes=["no all_attestations in report"])

    nodes = []
    for e in fleet:
        q = e.get("intel_quote")
        try:
            d = dcap.verify(q) if q else {}
        except Exception as ex:
            d = {"error": str(ex)[:60]}
        g = nvidia.verify(e.get("gpu_evidence"))
        nodes.append({"dcap": d, "gpu": g, "e2e": e.get("e2e_pubkey")})

    n = len(nodes)
    cpu_ok = sum(1 for x in nodes if x["dcap"].get("root_trusted"))
    gpu_ok = sum(1 for x in nodes if x["gpu"].get("root_trusted"))
    cpu_root = cpu_ok == n
    gpu_root = gpu_ok == n
    cpu_sig = all(x["dcap"].get("quote_sig_ok") for x in nodes)
    tcbs = [x["dcap"].get("tcb_status", "unknown") for x in nodes]
    tcb = "UpToDate" if all(t == "UpToDate" for t in tcbs) \
        else next((t for t in tcbs if t and t != "UpToDate"), "unknown")
    arch = nodes[0]["gpu"].get("arch")
    die = nodes[0]["gpu"].get("die")

    notes = [
        "Intel TDX fleet: %d/%d nodes DCAP-verified to Intel SGX Root CA" % (cpu_ok, n),
        "TCB status (worst of fleet): %s" % tcb,
        "NVIDIA %s GPU%s (%s): cert chain to NVIDIA Device Identity CA %s on %d/%d nodes"
        % (arch or "?", "" if n == 1 else "s", die or "?",
           "VERIFIED" if gpu_root else "NOT verified", gpu_ok, n),
        "quote transport: base64 (dstack gateways hand over hex)",
        "model binding: %s" % _NO_BIND,
    ]
    if atype:
        notes.append("provider self-reports attestation_type=%r" % atype)

    r = report(
        present=True,
        signature_valid=cpu_sig,
        root_trusted=cpu_root and gpu_root,
        freshness_ok=bool(rep.get("nonce")) and bool(nodes[0]["e2e"]),
        channel_bound=bool(nodes[0]["e2e"]),
        binds_model=False,
        vendor="intel-tdx+nvidia",
        notes=notes,
    )
    r["tcb_status"] = tcb
    r["fmspc"] = nodes[0]["dcap"].get("fmspc")
    r["fleet_size"] = n
    r["gpu_arch"] = arch
    r["gpu_die"] = die
    r["gpu_root_trusted"] = gpu_root
    r["attestation_type"] = atype
    # Raw fleet evidence so anyone can re-verify the seal offline (attest.py verify).
    r["evidence"] = {"format": "chutes-fleet", "nonce": rep.get("nonce"),
                     "all_attestations": [{"intel_quote": e.get("intel_quote"),
                                           "gpu_evidence": e.get("gpu_evidence")} for e in fleet]}
    try:
        qb = dcap._to_quote_bytes(fleet[0]["intel_quote"])
        r["measurements"] = {"mrtd": qb[184:232].hex()}
    except Exception:
        pass
    return r
