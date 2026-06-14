from . import none as _none
from . import dstack as _dstack
from . import chutes as _chutes


def verify(att_cfg, ctx):
    """att_cfg: provider manifest 'attestation' block. ctx: {request_id, ...}."""
    t = (att_cfg or {}).get("type", "none")
    if t in ("none", None):
        return _none.verify(att_cfg, ctx)
    if t in ("dstack-tdx", "redpill", "intel-tdx"):
        return _dstack.verify(att_cfg, ctx)
    if t in ("chutes-tee", "nanogpt-tee", "chutes"):
        return _chutes.verify(att_cfg, ctx)
    r = _none.verify(att_cfg, ctx)
    r["notes"] = ["unsupported attestation type: %s" % t]
    return r
