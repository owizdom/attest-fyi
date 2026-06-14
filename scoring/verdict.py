"""Turn raw outputs + a reference + an attestation report into signals, a
0-100 score, and a verdict. Rules are explicit and conservative: a FAIL on
model identity is only raised when behaviour clearly diverges from the
claimed model's null, because a false accusation ends the project.
"""
from .metrics import exact_rate, sim_rate, error_count

MARGIN = 0.25          # how far below the null counts as divergence (from exp01/02)
MATCH_BAND = 0.10      # within this of the null = a match


def score_identity(provider_outs, reference):
    """reference: the stored fingerprint dict, or None."""
    if reference is None:
        return {"no_reference": True, "detail": "no reference fingerprint for claimed model"}
    ref_outs = reference["outputs"]
    null_e = reference.get("null_exact", 1.0)
    e = round(exact_rate(provider_outs, ref_outs), 4)
    s = round(sim_rate(provider_outs, ref_outs), 4)
    errs = error_count(provider_outs)

    diverges = e < (null_e - MARGIN)
    matches = e >= (null_e - MATCH_BAND)
    if diverges:
        if s < 0.4:
            detail = "model swap (different family or size)"
        elif e < 0.6:
            detail = "quantised or degraded engine"
        else:
            detail = "minor but real drift"
    elif matches:
        detail = "behaviour matches the claimed model"
    else:
        detail = "borderline; below null but within margin"

    n = len(provider_outs)
    confidence = "high" if n >= 20 else "medium" if n >= 10 else "low"
    identity_score = round(100 * min(1.0, e / null_e if null_e else e))
    return {"no_reference": False, "exact": e, "sim": s, "null_exact": null_e,
            "diverges": diverges, "matches": matches, "detail": detail,
            "identity_score": identity_score, "confidence": confidence, "errors": errs}


def decide_verdict(att, identity):
    """att: attestation report dict. identity: score_identity output."""
    seal = att["present"] and att["signature_valid"]
    # Inference unavailable (no credit / endpoint down): the behavioural axis is
    # blank, but a verified seal still earns a partial. No seal -> error.
    if identity.get("probes_unavailable"):
        return "partial" if seal else "error"
    if identity.get("no_reference"):
        # can't speak to model identity; lean on the seal alone
        return "partial" if seal else "unknown"
    if identity["diverges"]:
        return "fail"                       # wrong engine, regardless of any seal
    # identity matches or borderline-ok
    if att["present"] and att["signature_valid"] and att["root_trusted"]:
        return "pass" if att["binds_model"] else "partial"
    return "partial" if identity["matches"] else "unknown"


def overall_score(att, identity):
    a = att.get("score", 0)
    if identity.get("probes_unavailable") or identity.get("no_reference"):
        return round(a * 0.8)              # attestation-driven
    i = identity["identity_score"]
    if att["present"]:
        return round(0.5 * i + 0.5 * a)
    return round(i * 0.6)               # no attestation caps the ceiling


def score_provider(provider, att, identity):
    verdict = decide_verdict(att, identity)
    return {
        "verdict": verdict,
        "score": overall_score(att, identity),
        "attestation": att,
        "identity": identity,
    }
