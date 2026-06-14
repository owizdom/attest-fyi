"""Turn raw outputs + a reference + an attestation report into signals, a
0-100 score, and a verdict. Rules are explicit and conservative: a FAIL on
model identity is only raised when behaviour clearly diverges from the
claimed model's null, because a false accusation ends the project.
"""
from .metrics import exact_rate, sim_rate, error_count

MARGIN = 0.25          # how far below the null counts as divergence (from exp01/02)
MATCH_BAND = 0.10      # within this of the null = a match

# Behavioural model binding (vs a TRUSTED reference of the claimed open weights,
# with a decoy for discrimination). Thresholds are set from measured data.
SIM_TRUST_MIN = 0.55   # served must be at least this similar to the trusted ref
SIM_MARGIN = 0.20      # and this much closer to the trusted ref than to the decoy
SIM_DIVERGE = 0.45     # at/below this and not clearly closer to the ref = a swap


def behavioural_binding(served, trusted_outputs, decoy_outputs=None):
    """Verify the served model IS the claimed model by behaviour: it matches a
    reference we built from the canonical open weights and is distinguishable
    from a decoy. This is the honest binding when weights aren't measured."""
    s_t = round(sim_rate(served, trusted_outputs), 4)
    e_t = round(exact_rate(served, trusted_outputs), 4)
    s_d = round(sim_rate(served, decoy_outputs), 4) if decoy_outputs else None
    margin = round(s_t - s_d, 4) if s_d is not None else None
    bound = s_t >= SIM_TRUST_MIN and (s_d is None or margin >= SIM_MARGIN)
    diverges = (s_d is not None and s_t <= s_d) or s_t < SIM_DIVERGE
    if diverges:
        detail = "served model diverges from the claimed open weights"
        if s_d is not None and s_t <= s_d:
            detail += " — as close to a decoy as to the claim"
    elif bound:
        detail = "behaviour matches the claimed open weights"
        if s_d is not None:
            detail += ", and is distinguishable from a decoy"
    else:
        detail = "partly matches the claim but not decisively"
    # binding is binary (verified or not), so a bound model scores as verified,
    # not by the raw similarity (which quant/template differences depress).
    iscore = 100 if bound else (20 if diverges else round(100 * s_t))
    return {"no_reference": False, "binding": "behavioural", "bound": bound,
            "diverges": diverges, "matches": bound or not diverges,
            "sim_trusted": s_t, "exact_trusted": e_t, "sim_decoy": s_d,
            "margin": margin, "identity_score": iscore, "detail": detail}


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
    if identity.get("diverges"):
        return "fail"                       # wrong engine, regardless of any seal
    # identity matches: Pass needs a DCAP-rooted seal AND the model bound, either
    # by measurement (strongest) or by behaviour vs a trusted reference.
    bound = att.get("binds_model") or identity.get("bound")
    if att["present"] and att["signature_valid"] and att["root_trusted"] and bound:
        return "pass"
    if att["present"] and att["signature_valid"]:
        return "partial"
    return "partial" if identity.get("matches") else "unknown"


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
