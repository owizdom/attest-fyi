"""Intel TDX (v4 / ECDSA-256) DCAP quote verification — the signature chain up
to Intel's pinned SGX Root CA, plus TCB status from Intel PCS. Uses the
`cryptography` library (installed in .venv).

End to end this proves the quote is a genuine Intel-attested TDX quote:
  1. the attestation key signed the quote (header + TD report)
  2. the QE report binds that attestation key   (report_data = SHA256(key||auth))
  3. the PCK leaf certificate signed the QE report
  4. the PCK cert chain validates to the pinned Intel SGX Root CA
  5. (TCB) the platform's TCB level per Intel PCS collateral

Tested against live RedPill and NEAR AI quotes.
"""
import base64
import hashlib
import json
import string
import urllib.parse
import urllib.request

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.exceptions import InvalidSignature

# Pinned Intel SGX Root CA (see attestation/intel_sgx_root_ca.pem). The chain's
# root must match this fingerprint; we never trust a fetched root.
INTEL_ROOT_FPR = "44a0196b2b99f889b8e149e95b807a350e7424964399e885a7cbb8ccfab674d3"
SGX_EXT_OID = "1.2.840.113741.1.13.1"
FMSPC_OID_TLV = bytes.fromhex("060a2a864886f84d010d0104")  # OID 1.2.840.113741.1.13.1.4
PCS_TDX_TCB = "https://api.trustedservices.intel.com/tdx/certification/v4/tcb?fmspc=%s"


def _pub_from_raw(raw64):
    return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), b"\x04" + raw64)


def _verify_ecdsa(pubkey, sig_raw64, data):
    r = int.from_bytes(sig_raw64[:32], "big")
    s = int.from_bytes(sig_raw64[32:64], "big")
    pubkey.verify(encode_dss_signature(r, s), data, ec.ECDSA(hashes.SHA256()))


def _parse_sig(quote):
    sig_len = int.from_bytes(quote[632:636], "little")
    sig = quote[636:636 + sig_len]
    o = 0
    att_sig = sig[o:o + 64]; o += 64
    att_pub = sig[o:o + 64]; o += 64
    o += 2  # cert_data_type (6)
    cd_size = int.from_bytes(sig[o:o + 4], "little"); o += 4
    cd = sig[o:o + cd_size]
    p = 0
    qe_report = cd[p:p + 384]; p += 384
    qe_sig = cd[p:p + 64]; p += 64
    auth_len = int.from_bytes(cd[p:p + 2], "little"); p += 2
    auth = cd[p:p + auth_len]; p += auth_len
    p += 2  # qe cert_data_type (5 = PCK chain PEM)
    pem_size = int.from_bytes(cd[p:p + 4], "little"); p += 4
    pem = cd[p:p + pem_size]
    return att_sig, att_pub, qe_report, qe_sig, auth, pem


def _load_chain(pem_bytes):
    txt = pem_bytes.decode("ascii", "ignore")
    out = []
    B, E = "-----BEGIN CERTIFICATE-----", "-----END CERTIFICATE-----"
    for part in txt.split(B)[1:]:
        pem = B + part.split(E)[0] + E + "\n"
        try:
            out.append(x509.load_pem_x509_certificate(pem.encode()))
        except Exception:
            pass
    return out


def _chain_valid(certs):
    try:
        for i in range(len(certs) - 1):
            certs[i + 1].public_key().verify(
                certs[i].signature, certs[i].tbs_certificate_bytes,
                ec.ECDSA(certs[i].signature_hash_algorithm))
        root = certs[-1]
        root.public_key().verify(root.signature, root.tbs_certificate_bytes,
                                 ec.ECDSA(root.signature_hash_algorithm))
        return True
    except Exception:
        return False


def _fmspc(leaf):
    try:
        der = leaf.extensions.get_extension_for_oid(x509.ObjectIdentifier(SGX_EXT_OID)).value.value
    except Exception:
        return None
    i = der.find(FMSPC_OID_TLV)
    if i < 0:
        return None
    p = i + len(FMSPC_OID_TLV)
    if der[p] == 0x04:
        ln = der[p + 1]
        return der[p + 2:p + 2 + ln].hex()
    return None


TCB_OID = bytes.fromhex("2a864886f84d010d0102")  # 1.2.840.113741.1.13.1.2


def _tlv(data, i=0):
    tag = data[i]; i += 1
    ln = data[i]; i += 1
    if ln & 0x80:
        n = ln & 0x7f; ln = int.from_bytes(data[i:i + n], "big"); i += n
    return tag, data[i:i + ln], i + ln


def _children(content):
    out, i = [], 0
    while i < len(content):
        tag, val, i = _tlv(content, i)
        out.append((tag, val))
    return out


def _platform_sgx_tcb(leaf):
    """16 SGX TCB components + pcesvn from the PCK cert SGX extension."""
    der = leaf.extensions.get_extension_for_oid(x509.ObjectIdentifier(SGX_EXT_OID)).value.value
    _, content, _ = _tlv(der)
    for _, pair in _children(content):
        kids = _children(pair)
        if len(kids) >= 2 and kids[0][0] == 0x06 and kids[0][1] == TCB_OID:
            comps, pcesvn = [], None
            for _, cp in _children(kids[1][1]):
                ck = _children(cp)
                n = ck[0][1][-1]
                if 1 <= n <= 16:
                    comps.append((n, int.from_bytes(ck[1][1], "big")))
                elif n == 17:
                    pcesvn = int.from_bytes(ck[1][1], "big")
            return [v for _, v in sorted(comps)], pcesvn
    return None, None


def _matching_brace(b, start):
    depth = 0
    for i in range(start, len(b)):
        if b[i] == 0x7b:
            depth += 1
        elif b[i] == 0x7d:
            depth -= 1
            if depth == 0:
                return i + 1
    return -1


def tcb_status(quote, leaf):
    """Fetch Intel PCS TCB info for the platform's FMSPC, verify it is
    Intel-signed, and evaluate the platform's TCB level. Best-effort."""
    fmspc = _fmspc(leaf)
    if not fmspc:
        return "unknown", "no fmspc"
    try:
        resp = urllib.request.urlopen(PCS_TDX_TCB % fmspc, timeout=30)
        raw = resp.read()
        chain = urllib.parse.unquote(resp.headers.get("TCB-Info-Issuer-Chain", "")).encode()
    except Exception as e:
        return "unknown", "pcs fetch failed: %s" % type(e).__name__
    try:
        obj = json.loads(raw)
        i = raw.find(b'"tcbInfo":'); bs = raw.find(b"{", i); be = _matching_brace(raw, bs)
        tcbinfo_raw = raw[bs:be]
        certs = _load_chain(chain)
        _verify_ecdsa(certs[0].public_key(), bytes.fromhex(obj["signature"]), tcbinfo_raw)
        signed_ok = _chain_valid(certs) and certs[-1].fingerprint(hashes.SHA256()).hex() == INTEL_ROOT_FPR
        if not signed_ok:
            return "unknown", "tcb collateral not Intel-signed"
        sgx, pcesvn = _platform_sgx_tcb(leaf)
        tdx = list(quote[48:64])  # tee_tcb_svn = TD report body[0:16]
        for lvl in obj["tcbInfo"].get("tcbLevels", []):
            t = lvl["tcb"]
            sgx_ok = pcesvn is not None and pcesvn >= t["pcesvn"] and all(
                sgx[k] >= t["sgxtcbcomponents"][k]["svn"] for k in range(16))
            tdx_l = t.get("tdxtcbcomponents")
            tdx_ok = (not tdx_l) or all(tdx[k] >= tdx_l[k]["svn"] for k in range(16))
            if sgx_ok and tdx_ok:
                return lvl["tcbStatus"], "matched tcb level (%s)" % lvl.get("tcbDate", "")
        return "OutOfDate", "no tcb level satisfied"
    except Exception as e:
        return "unknown", "tcb eval failed: %s" % type(e).__name__


def _to_quote_bytes(q):
    """Accept a TDX quote as raw bytes, a hex string, or base64. dstack
    gateways (RedPill, NEAR) hand us hex; Chutes/NanoGPT hand us base64. Pick
    whichever decoding yields a sane TDX header (version 3/4/5)."""
    if isinstance(q, (bytes, bytearray)):
        return bytes(q)
    s = "".join(q.split())
    cands = []
    if len(s) % 2 == 0 and s and all(c in string.hexdigits for c in s):
        try:
            cands.append(bytes.fromhex(s))
        except Exception:
            pass
    try:
        cands.append(base64.b64decode(s, validate=False))
    except Exception:
        pass
    for b in cands:
        if len(b) >= 8 and int.from_bytes(b[0:2], "little") in (3, 4, 5):
            return b
    return cands[0] if cands else b""


def verify(quote_in):
    """Return the DCAP verdict for a TDX quote (hex string, base64, or bytes)."""
    out = {"quote_sig_ok": False, "qe_bind_ok": False, "qe_sig_ok": False,
           "chain_ok": False, "root_trusted": False, "fmspc": None, "dcap_ok": False}
    try:
        quote = _to_quote_bytes(quote_in)
        att_sig, att_pub, qe_report, qe_sig, auth, pem = _parse_sig(quote)
    except Exception as e:
        out["error"] = "parse: %s" % e
        return out

    try:
        _verify_ecdsa(_pub_from_raw(att_pub), att_sig, quote[:632])
        out["quote_sig_ok"] = True
    except InvalidSignature:
        pass
    except Exception as e:
        out["error"] = "att-sig: %s" % e

    out["qe_bind_ok"] = qe_report[320:352] == hashlib.sha256(att_pub + auth).digest()

    certs = _load_chain(pem)
    if certs:
        try:
            _verify_ecdsa(certs[0].public_key(), qe_sig, qe_report)
            out["qe_sig_ok"] = True
        except Exception:
            pass
        out["chain_ok"] = _chain_valid(certs)
        out["root_trusted"] = out["chain_ok"] and \
            certs[-1].fingerprint(hashes.SHA256()).hex() == INTEL_ROOT_FPR
        out["fmspc"] = _fmspc(certs[0])
        if out["root_trusted"]:
            out["tcb_status"], out["tcb_note"] = tcb_status(quote, certs[0])

    out["dcap_ok"] = (out["quote_sig_ok"] and out["qe_bind_ok"]
                      and out["qe_sig_ok"] and out["root_trusted"])
    return out
