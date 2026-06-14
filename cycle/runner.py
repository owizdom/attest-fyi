"""Orchestrate one benchmark cycle: load provider manifests, run the probe
suite against each, fetch and verify attestation, score, and write the cycle
result plus results/latest.json that the site renders."""
import datetime
import glob
import json
import os
import re

from config import (PROVIDERS_DIR, RESULTS_DIR, DEFAULT_SEED, SUITE_VERSION, load_key)
from probes.suite import generate, suite_commit
from models.factory import make_client
from harness.runner import run_probes
from references.registry import load_reference
from attestation.factory import verify as verify_attestation
from scoring.verdict import score_identity, score_provider


def _needs_missing_key(spec):
    ke = spec.get("key_env")
    return bool(ke) and load_key(ke) is None


_UNFUNDED = re.compile(r"balance|credit|quota|payment|spending|insufficient|add credits", re.I)


def _is_unfunded(reason):
    return bool(_UNFUNDED.search(reason or ""))


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


def run_cycle(seed=DEFAULT_SEED, workers=2, verbose=True):
    probes = generate(seed)
    manifests = _load_manifests()
    rows = []
    for m in manifests:
        served = m["served"]
        decoding = m.get("decoding") or {"temperature": 0.0, "max_tokens": 256, "seed": seed}
        attested_label = m.get("claims", {}).get("label") or m.get("claims", {}).get("attested_model")
        base_row = {"id": m["id"], "displayName": m["displayName"],
                    "tags": m.get("tags", []), "served_model": served.get("model"),
                    "attested_label": attested_label}

        if _needs_missing_key(served):
            rows.append(dict(base_row, status="skipped",
                             reason="no key", verdict="skipped", score=None))
            if verbose:
                print("  %-18s skipped (no key)" % m["id"])
            continue

        client = make_client(served)
        # Liveness check before the full battery. If inference is down (no
        # credit, endpoint error) we still seal-audit via the attestation.
        live = client.generate("Reply with one word: ping", temperature=0.0, max_tokens=8, seed=42)
        if live.startswith(("<ERR", "<EMPTY")):
            outputs, run_rec = [], {"request_id": None, "merkle_root": None, "errors": 0}
            reason = live.strip("<>").strip()
            reason = reason[4:] if reason.startswith("ERR ") else reason
            identity = {"no_reference": True, "probes_unavailable": True,
                        "reason": reason, "detail": "behaviour pending: " + reason}
        else:
            outputs, run_rec = run_probes(client, probes, decoding, workers=workers)
            identity = score_identity(outputs, load_reference(m.get("claims", {}).get("attested_model")))

        att = verify_attestation(m.get("attestation", {}),
                                 {"request_id": run_rec.get("request_id"), "model": served.get("model")})

        # keyed but unfunded and no verifiable seal -> a clean "awaiting credit"
        # row, not an error. Providers with a verified seal still score below.
        seal = att.get("present") and att.get("signature_valid")
        if identity.get("probes_unavailable") and not seal and _is_unfunded(identity.get("reason", "")):
            rows.append(dict(base_row, status="skipped", reason="awaiting credit",
                             verdict="skipped", score=None, attestation=att))
            if verbose:
                print("  %-18s awaiting credit" % m["id"])
            continue

        scored = score_provider(m, att, identity)

        rows.append(dict(base_row, status="scored",
                         verdict=scored["verdict"], score=scored["score"],
                         identity=identity, attestation=att,
                         evidence={"merkle_root": run_rec.get("merkle_root"),
                                   "request_id": run_rec.get("request_id"),
                                   "errors": run_rec.get("errors", 0)}))
        if verbose:
            print("  %-18s %-8s score=%s  %s"
                  % (m["id"], scored["verdict"], scored["score"], identity.get("detail", "")))

    scored_rows = [r for r in rows if r["status"] == "scored"]
    with_ref = [r for r in scored_rows if not r["identity"].get("no_reference")]
    deviating = [r for r in with_ref if r["identity"].get("diverges")]
    seals = [r for r in scored_rows
             if r.get("attestation", {}).get("present") and r["attestation"].get("signature_valid")]

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
    }

    cycle_no = _next_cycle()
    result = {
        "cycle": cycle_no,
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "suite_version": SUITE_VERSION, "seed": seed,
        "seed_commit": suite_commit(seed),
        "summary": summary, "providers": rows,
    }
    os.makedirs(RESULTS_DIR, exist_ok=True)
    json.dump(result, open(os.path.join(RESULTS_DIR, "cycle-%d.json" % cycle_no), "w"), indent=2)
    json.dump(result, open(os.path.join(RESULTS_DIR, "latest.json"), "w"), indent=2)
    return result
