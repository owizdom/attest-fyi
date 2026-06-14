"""Aggregate past cycles into a compact history for the chart and frontier."""
import glob
import json
import os

from config import RESULTS_DIR


def _cycle_no(path):
    base = os.path.basename(path)[6:-5]
    return int(base) if base.isdigit() else 0


def enrich_latest():
    """latest.json with each provider's score delta vs the previous cycle."""
    p = os.path.join(RESULTS_DIR, "latest.json")
    if not os.path.exists(p):
        return {}
    d = json.load(open(p))
    prev = os.path.join(RESULTS_DIR, "cycle-%d.json" % (d.get("cycle", 1) - 1))
    prev_scores = {}
    if os.path.exists(prev):
        pd = json.load(open(prev))
        prev_scores = {x["id"]: x.get("score") for x in pd.get("providers", [])}
    for pr in d.get("providers", []):
        ps = prev_scores.get(pr["id"])
        s = pr.get("score")
        pr["delta"] = (s - ps) if (s is not None and ps is not None) else None
    return d


def load_history():
    out = []
    for f in sorted(glob.glob(os.path.join(RESULTS_DIR, "cycle-*.json")), key=_cycle_no):
        d = json.load(open(f))
        s = d["summary"]
        out.append({
            "cycle": d["cycle"], "generated_at": d["generated_at"],
            "trust_gap_pct": s["trust_gap_pct"],
            "pass": s["pass"], "partial": s["partial"], "fail": s["fail"],
            "scored": s["scored"], "with_reference": s.get("with_reference", 0),
            "pass_rate_pct": round(100 * s["pass"] / s["scored"]) if s["scored"] else 0,
        })
    return out
