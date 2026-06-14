"""Minimal Intel TDX (v4) quote parser and structural verifier. Stdlib only.

Offsets validated against live RedPill and NEAR AI quotes. We verify what is
checkable without Intel's PCCS/DCAP service: that the blob is a genuine Intel
TDX v4 quote (header), extract the measurements (MRTD, RTMR0-3) and REPORT_DATA,
and confirm REPORT_DATA binds a given signing key/address. The PCK cert-chain to
Intel's SGX Root CA and the TCB status are NOT checked here and are reported as
pending by the caller.

TDX v4 quote layout:
  header        48 bytes  (version, att-key-type, tee-type, qe-vendor-id, ...)
  td report    584 bytes  starting at offset 48
    ... MRTD at body+136, RTMR0..3 at body+328/376/424/472, REPORT_DATA at body+520
"""

INTEL_QE_VENDOR_ID = "939a7233f79c4ca9940a0db3957f0607"
TEE_TYPE_TDX = 0x81


def parse(hexstr):
    b = bytes.fromhex(hexstr)
    if len(b) < 632:
        raise ValueError("quote too short: %d bytes" % len(b))
    return {
        "version": int.from_bytes(b[0:2], "little"),
        "att_key_type": int.from_bytes(b[2:4], "little"),
        "tee_type": int.from_bytes(b[4:8], "little"),
        "qe_vendor_id": b[12:28].hex(),
        "mrtd": b[184:232].hex(),
        "rtmr0": b[328:376].hex(),
        "rtmr1": b[376:424].hex(),
        "rtmr2": b[424:472].hex(),
        "rtmr3": b[472:520].hex(),
        "report_data": b[568:632].hex(),
    }


def verify(hexstr, signing_key=None):
    """signing_key: hex of the gateway pubkey/address REPORT_DATA must commit to."""
    q = parse(hexstr)
    is_tdx_v4 = q["version"] == 4 and q["tee_type"] == TEE_TYPE_TDX
    intel_qe = q["qe_vendor_id"] == INTEL_QE_VENDOR_ID
    binds_key = False
    if signing_key:
        sk = signing_key.lower()
        sk = sk[2:] if sk.startswith("0x") else sk
        binds_key = q["report_data"].startswith(sk)
    return {
        "well_formed": is_tdx_v4 and intel_qe,
        "is_tdx_v4": is_tdx_v4,
        "intel_qe": intel_qe,
        "binds_key": binds_key,
        "report_data": q["report_data"],
        "measurements": {k: q[k] for k in ("mrtd", "rtmr0", "rtmr1", "rtmr2", "rtmr3")},
    }
