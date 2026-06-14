"""RedPill (Phala) attestation. The provider exposes:
    GET /v1/signature/{request_id}      -> signed response, recover signer
    GET /v1/attestation/report          -> TDX quote for the serving enclave

We verify what is verifiable in pure stdlib: the endpoints respond, a
signature is present and bound to our request, and a quote with measurements
is returned. Full TDX cert-chain verification (Intel DCAP / TCB) and the
measurement->model binding are marked unverified here with an honest note,
not silently asserted. That is the next layer to build, see DESIGN.md.
"""
import urllib.error

from config import load_key
from models._http import get
from .base import report


def verify(cfg, ctx):
    base = cfg["base_url"].rstrip("/")
    key = load_key(cfg.get("key_env"))
    req_id = ctx.get("request_id")
    headers = {"Authorization": "Bearer " + key} if key else {}
    notes = []
    if not req_id:
        return report(present=False, vendor="intel-tdx",
                      notes=["no request id captured; cannot bind a quote"])
    sig_ok = False
    quote_present = False
    try:
        sig = get("%s/signature/%s" % (base, req_id), headers)
        sig_ok = bool(sig)
    except urllib.error.HTTPError as e:
        notes.append("signature endpoint HTTP %d" % e.code)
    except Exception as e:
        notes.append("signature fetch failed: %s" % type(e).__name__)
    try:
        rep = get("%s/attestation/report" % base, headers)
        quote_present = bool(rep)
    except urllib.error.HTTPError as e:
        notes.append("attestation endpoint HTTP %d" % e.code)
    except Exception as e:
        notes.append("attestation fetch failed: %s" % type(e).__name__)

    notes.append("TDX cert-chain + measurement->model binding not yet verified")
    return report(
        present=quote_present, signature_valid=sig_ok,
        root_trusted=False, freshness_ok=bool(req_id),
        channel_bound=sig_ok, binds_model=False,
        vendor="intel-tdx", notes=notes)
