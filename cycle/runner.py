"""Orchestrate one benchmark cycle: load provider manifests, run the probe
suite against each, fetch and verify attestation, score, and write the cycle
result plus results/latest.json that the site renders."""
import datetime
import glob
import json
import os
import random
import re

from config import (PROVIDERS_DIR, RESULTS_DIR, DEFAULT_SEED, SUITE_VERSION, load_key)
from probes.suite import generate, sample, suite_commit
from models.factory import make_client
from harness.runner import run_probes
from references.registry import load_reference
from attestation.factory import verify as verify_attestation
from scoring.verdict import score_identity, behavioural_binding, score_provider


def _needs_missing_key(spec):
    ke = spec.get("key_env")
    return bool(ke) and load_key(ke) is None


_UNFUNDED = re.compile(r"balance|credit|quota|payment|spending|insufficient|add credits", re.I)


def _is_unfunded(reason):
    return bool(_UNFUNDED.search(reason or ""))


def _provenance(att, identity):
    """How trustworthy the verdict is to an outsider:
      reproduced  - independently reproducible: the seal re-verifies from the
                    bytes, and (if a model is claimed) its responses are signed
                    by the attested enclave. Trustless end to end.
      as-submitted- a model is bound, but its transcript rests on whoever ran it,
                    not on a response signature. Reproducible vs the reference,
                    capture trusted.
      unverified  - neither a verifiable seal nor a bound model."""
    seal_ok = bool(att.get("present") and att.get("signature_valid") and att.get("root_trusted"))
    bound = bool(identity.get("bound") or att.get("binds_model"))
    if not bound:
        return "reproduced" if seal_ok else "unverified"
    if identity.get("behaviour_signed") and seal_ok:
        return "reproduced"
    return "as-submitted"


def _load_manifests():
    out = []
    for p in sorted(glob.glob(os.path.join(PROVIDERS_DIR, "*.json"))):
        out.append(json.load(open(p)))
    return out


def _next_cycle():
    existing = glob.glob(os.path.join(RESULTS_DIR, "cycle-*.json"))
    nums = [int(os.path.basename(f)[6:-5]) for f in existing
            if os.path.basename(f)[6:-5].isdigit()]
    return (max(nums) + 1) if nums else 1


def audit_one(m, probes, idx=None, seed=DEFAULT_SEED, workers=2):
    """Audit one provider manifest with the full metric (liveness + probes + seal
    verify + score). `probes` is the sampled subset of the pool and `idx` their
    pool positions, used to slice the reference's outputs to the same probes.
    Returns (row, seal_evidence). Pure: writes nothing and never touches the board."""
    served = m["served"]
    decoding = m.get("decoding") or {"temperature": 0.0, "max_tokens": 256, "seed": seed}
    attested_label = m.get("claims", {}).get("label") or m.get("claims", {}).get("attested_model")
    base_row = {"id": m["id"], "displayName": m["displayName"],
                "tags": m.get("tags", []), "served_model": served.get("model"),
                "attested_label": attested_label, "pitch": m.get("pitch"),
                "findings": m.get("findings")}

    # Inside-only providers (EigenAI): the gateway is caller-attested — only an
    # attested EigenCompute enclave can call it — so attest.fyi can't audit it
    # from outside. A clean, honest row: "unknown" by design, not by our failure.
    # The eigenai task covers auditing it from inside the network.
    if m.get("external_auditable") is False:
        note = m.get("scope_note") or "not externally auditable from outside the network"
        return dict(base_row, status="scored", verdict="unknown", score=None,
                    provenance="inside-only",
                    identity={"no_reference": True, "detail": note},
                    attestation={"present": False, "vendor": "intel-tdx", "notes": [note]}), None

    if _needs_missing_key(served):
        return dict(base_row, status="skipped", reason="no key",
                    verdict="skipped", score=None), None

    client = make_client(served)
    # Liveness check before the full battery. If inference is down (no credit,
    # endpoint error) we still seal-audit via the attestation.
    live = client.generate("Reply with one word: ping", temperature=0.0, max_tokens=8, seed=42)
    if live.startswith(("<ERR", "<EMPTY")):
        outputs, run_rec = [], {"request_id": None, "merkle_root": None, "errors": 0}
        reason = live.strip("<>").strip()
        reason = reason[4:] if reason.startswith("ERR ") else reason
        detail = ("served model returned an empty completion at the liveness check "
                  "(reasoning model); seal audited, behaviour not probed this cycle"
                  if reason.upper().startswith("EMPTY")
                  else "behaviour pending: " + reason)
        identity = {"no_reference": True, "probes_unavailable": True,
                    "reason": reason, "detail": detail}
    else:
        outputs, run_rec = run_probes(client, probes, decoding, workers=workers)
        refcfg = m.get("reference")
        if refcfg:
            # behavioural binding vs a TRUSTED reference (canonical open weights
            # we ran ourselves) + a decoy for discrimination
            trusted = load_reference(refcfg["model_id"])
            decoy = load_reference(refcfg["decoy_id"]) if refcfg.get("decoy_id") else None
            if trusted:
                def _slice(ref):
                    o = ref["outputs"]
                    return [o[i] for i in idx] if idx is not None else o
                identity = behavioural_binding(
                    outputs, _slice(trusted), _slice(decoy) if decoy else None)
            else:
                identity = {"no_reference": True, "detail": "trusted reference not built"}
        else:
            identity = score_identity(outputs, load_reference(m.get("claims", {}).get("attested_model")))

    att = verify_attestation(m.get("attestation", {}),
                             {"request_id": run_rec.get("request_id"), "model": served.get("model")})
    ev = att.pop("evidence", None)  # raw seal bundle -> results/evidence/<id>.json

    # Gold path: if the provider signs responses and the seal binds its key, prove
    # a sample of the scored prompts are signed by an Intel-attested node — making
    # the behavioural transcript trustless, not just "as submitted".
    sign_cfg = m.get("sign")
    if sign_cfg and not identity.get("probes_unavailable") \
            and att.get("present") and att.get("channel_bound"):
        try:
            from attestation.signing import signed_check
            sc = signed_check(served, sign_cfg, m["attestation"],
                              [p["prompt"] for p in probes[:5]])
            identity["signed"] = {"verified": sc["verified"], "total": sc["total"]}
            identity["behaviour_signed"] = bool(sc["total"]) and sc["verified"] == sc["total"]
            ev = ev or {}
            ev["signed"] = {k: sc[k] for k in ("format", "samples", "pool", "pool_quotes")}
        except Exception:
            pass

    # keyed but unfunded and no verifiable seal -> a clean "awaiting credit" row.
    seal = att.get("present") and att.get("signature_valid")
    if identity.get("probes_unavailable") and not seal and _is_unfunded(identity.get("reason", "")):
        return dict(base_row, status="skipped", reason="awaiting credit",
                    verdict="skipped", score=None, attestation=att), ev

    scored = score_provider(m, att, identity)
    row = dict(base_row, status="scored",
               verdict=scored["verdict"], score=scored["score"],
               identity=identity, attestation=att,
               provenance=_provenance(att, identity),
               evidence={"merkle_root": run_rec.get("merkle_root"),
                         "request_id": run_rec.get("request_id"),
                         "errors": run_rec.get("errors", 0)})
    return row, ev


def write_evidence(pid, ev):
    """Persist a seal evidence bundle to results/evidence/<id>.json."""
    if not ev:
        return
    evdir = os.path.join(RESULTS_DIR, "evidence")
    os.makedirs(evdir, exist_ok=True)
    json.dump(ev, open(os.path.join(evdir, "%s.json" % pid), "w"), indent=2)


def run_cycle(seed=DEFAULT_SEED, workers=2, verbose=True, k=24):
    pool = generate(seed)
    # Fresh per-run nonce -> unpredictable subset of the pool. A provider can't
    # know which probes this run uses, so it can't whitelist the test set.
    nonce = "%016x" % random.getrandbits(64)
    probes, idx = sample(pool, k, nonce)
    manifests = _load_manifests()
    rows = []
    for m in manifests:
        row, ev = audit_one(m, probes, idx, seed=seed, workers=workers)
        write_evidence(m["id"], ev)
        rows.append(row)
        if verbose:
            if row["status"] == "skipped":
                print("  %-18s %s" % (m["id"], row.get("reason", "skipped")))
            else:
                print("  %-18s %-8s score=%s  %s"
                      % (m["id"], row["verdict"], row["score"],
                         (row.get("identity") or {}).get("detail", "")))

    scored_rows = [r for r in rows if r["status"] == "scored"]
    with_ref = [r for r in scored_rows if not r["identity"].get("no_reference")]
    deviating = [r for r in with_ref if r["identity"].get("diverges")]
    seals = [r for r in scored_rows
             if r.get("attestation", {}).get("present") and r["attestation"].get("signature_valid")]
    # Model is verified iff bound by behaviour OR measured in the quote. Everything
    # else has a seal (or not) but no proof of which model actually answered.
    model_verified = [r for r in scored_rows if r["identity"].get("bound")
                      or r.get("attestation", {}).get("binds_model")]
    model_unverified = len(scored_rows) - len(model_verified)

    def count(v):
        return sum(1 for r in scored_rows if r["verdict"] == v)

    summary = {
        "providers": len(rows), "scored": len(scored_rows),
        "pass": count("pass"), "partial": count("partial"),
        "fail": count("fail"), "unknown": count("unknown"), "error": count("error"),
        "skipped": sum(1 for r in rows if r["status"] == "skipped"),
        "with_reference": len(with_ref), "deviating": len(deviating),
        "seals_verified": len(seals),
        "trust_gap_pct": round(100 * len(deviating) / len(with_ref)) if with_ref else 0,
        "model_verified": len(model_verified),
        "model_unverified": model_unverified,
        "model_unverified_pct": round(100 * model_unverified / len(scored_rows)) if scored_rows else 0,
    }

    cycle_no = _next_cycle()
    result = {
        "cycle": cycle_no,
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "suite_version": SUITE_VERSION, "seed": seed,
        "seed_commit": suite_commit(seed),
        # The reveal: which probes this run used, sampled unpredictably from the
        # pool by `nonce`. sample(pool, k, nonce) reproduces `indices` exactly.
        "sample": {"nonce": nonce, "pool_size": len(pool), "pool_commit": suite_commit(seed),
                   "k": len(idx), "indices": idx},
        "summary": summary, "providers": rows,
    }
    os.makedirs(RESULTS_DIR, exist_ok=True)
    json.dump(result, open(os.path.join(RESULTS_DIR, "cycle-%d.json" % cycle_no), "w"), indent=2)
    json.dump(result, open(os.path.join(RESULTS_DIR, "latest.json"), "w"), indent=2)
    return result
