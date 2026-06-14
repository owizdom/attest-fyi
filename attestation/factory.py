from . import none as _none
from . import redpill as _redpill


def verify(att_cfg, ctx):
    """att_cfg: provider manifest 'attestation' block. ctx: {request_id, ...}."""
    t = (att_cfg or {}).get("type", "none")
    if t in ("none", None):
        return _none.verify(att_cfg, ctx)
    if t in ("redpill", "intel-tdx-redpill"):
        return _redpill.verify(att_cfg, ctx)
    # unknown attestation type -> treat as absent, with a note
    r = _none.verify(att_cfg, ctx)
    r["notes"] = ["unsupported attestation type: %s" % t]
    return r
