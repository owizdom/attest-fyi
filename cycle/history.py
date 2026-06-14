"""Aggregate past cycles into a compact history for the chart and frontier."""
import glob
import json
import os

from config import RESULTS_DIR


def _cycle_no(path):
    base = os.path.basename(path)[6:-5]
    return int(base) if base.isdigit() else 0


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
