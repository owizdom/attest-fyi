"""NVIDIA GPU confidential-computing attestation.

Chutes — and NanoGPT, which resells Chutes infrastructure — attach `gpu_evidence`
alongside the Intel TDX quote. Each entry carries a base64 PEM certificate chain,
an SPDM `evidence` blob, and the GPU `arch`. This module verifies the chain up to
NVIDIA's pinned Device Identity CA.

What this proves: the GPU presenting the evidence holds a private key that NVIDIA
certified, in a chain rooted at NVIDIA's Device Identity CA, as a genuine
confidential-computing GPU of the named architecture/die.

What it does NOT prove on its own: that the SPDM measurement block matches a
known-good golden value — that needs NVIDIA's NRAS / a measurement registry,
which no provider in scope publishes. So this is device-identity verification,
not full measurement attestation. Tested against live Chutes/NanoGPT Blackwell
(GB202) evidence.
"""
import base64
import json
import re

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, padding
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicKey

# Pinned NVIDIA Device Identity CA — the self-signed root of the GPU cert chain.
# Cross-check against NVIDIA's published Device Identity CA before trusting blindly.
NVIDIA_ROOT_FPR = "102bf659d5419614c9d8e6aecebc80454eb26b1df6a769ac720b9a690b167b48"

B = "-----BEGIN CERTIFICATE-----"
E = "-----END CERTIFICATE-----"
_DIE = re.compile(r"\b([A-Z]{2}\d{3})\b")


def _load_chain(pem_text):
    out = []
    for part in pem_text.split(B)[1:]:
        one = B + part.split(E)[0] + E
        try:
            out.append(x509.load_pem_x509_certificate(one.encode()))
        except Exception:
            pass
    return out


def _verify_sig(child, parent):
    pk = parent.public_key()
    if isinstance(pk, EllipticCurvePublicKey):
        pk.verify(child.signature, child.tbs_certificate_bytes,
                  ec.ECDSA(child.signature_hash_algorithm))
    else:
        pk.verify(child.signature, child.tbs_certificate_bytes,
                  padding.PKCS1v15(), child.signature_hash_algorithm)


def _chain_valid(certs):
    try:
        for i in range(len(certs) - 1):
            _verify_sig(certs[i], certs[i + 1])
        root = certs[-1]
        _verify_sig(root, root)  # self-signed
        return True
    except Exception:
        return False


def _cns(certs):
    out = []
    for c in certs:
        try:
            out.append(c.subject.get_attributes_for_oid(
                x509.oid.NameOID.COMMON_NAME)[0].value)
        except Exception:
            pass
    return out


def _decode_cert_field(c):
    if not c:
        return ""
    if B in c:
        return c
    try:
        return base64.b64decode(c).decode("ascii", "ignore")
    except Exception:
        return ""


def verify_one(entry):
    arch = entry.get("arch")
    certs = _load_chain(_decode_cert_field(entry.get("certificate", "")))
    out = {"arch": arch, "die": None, "chain_len": len(certs),
           "chain_ok": False, "root_trusted": False,
           "has_evidence": bool(entry.get("evidence"))}
    if not certs:
        return out
    cns = " ".join(_cns(certs))
    m = _DIE.search(cns)
    out["die"] = m.group(1) if m else None
    out["chain_ok"] = _chain_valid(certs)
    out["root_trusted"] = out["chain_ok"] and \
        certs[-1].fingerprint(hashes.SHA256()).hex() == NVIDIA_ROOT_FPR
    return out


def verify(gpu_evidence):
    """GPU evidence -> aggregate verdict. Accepts the two shapes seen in the
    wild: a bare list of entries (Chutes/NanoGPT `gpu_evidence`), or a payload
    object/JSON-string with an `evidence_list` and a top-level `arch` (Venice's
    `nvidia_payload`)."""
    arch_override = None
    if isinstance(gpu_evidence, str):
        try:
            gpu_evidence = json.loads(gpu_evidence)
        except Exception:
            return {"present": False, "gpu_count": 0, "chain_ok": False,
                    "root_trusted": False, "arch": None, "die": None}
    if isinstance(gpu_evidence, dict):
        arch_override = gpu_evidence.get("arch")
        gpu_evidence = (gpu_evidence.get("evidence_list")
                        or gpu_evidence.get("gpu_evidence") or [])
    if not isinstance(gpu_evidence, list) or not gpu_evidence:
        return {"present": False, "gpu_count": 0, "chain_ok": False,
                "root_trusted": False, "arch": None, "die": None}
    nodes = [verify_one(e) for e in gpu_evidence]
    arch = nodes[0]["arch"] or arch_override
    return {
        "present": True,
        "gpu_count": len(nodes),
        "chain_ok": all(n["chain_ok"] for n in nodes),
        "root_trusted": all(n["root_trusted"] for n in nodes),
        "has_evidence": all(n["has_evidence"] for n in nodes),
        "arch": (arch.upper() if isinstance(arch, str) else arch),
        "die": nodes[0]["die"],
    }
