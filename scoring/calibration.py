"""Calibrate the behavioural binding and publish a false-positive rate.

A `fail` accuses a company, so the threshold behind it needs a number. We run the
exact production binding on labelled pairs:

  quant  - the SAME model at a different quantisation (the realistic "same model,
           different deployment" case). These MUST bind; a `diverge` here is a
           false positive — we would wrongly accuse an honest provider.
  swap   - a DIFFERENT model (family or size). These MUST diverge; a miss here is
           a false negative — a real swap walks past.

Reuses the committed references where possible; runs the rest via Ollama.
"""
import json
import os

from config import RESULTS_DIR, DEFAULT_SEED
from probes.suite import generate
from harness.runner import run_probes
from models.factory import make_client
from references.registry import load_reference
from scoring import verdict
from scoring.verdict import behavioural_binding

# calibration model -> where to get its probe outputs
CALIB = {
    "qwen-7b": {"ref": "qwen-2.5-7b-instruct"},
    "llama1b-q8": {"ref": "decoy-llama-3.2-1b"},
    "llama8b-q4": {"ref": "llama-3.1-8b-instruct"},
    "llama1b-fp16": {"ollama": "llama3.2:1b-instruct-fp16"},
    "llama1b-q4": {"ollama": "llama3.2:1b-instruct-q4_K_M"},
}

# (served, trusted-reference, decoy, label)
PAIRS = [
    ("llama1b-q4", "llama1b-q8", "qwen-7b", "quant"),
    ("llama1b-fp16", "llama1b-q8", "qwen-7b", "quant"),
    ("llama1b-q8", "llama1b-fp16", "qwen-7b", "quant"),
    ("llama1b-q4", "llama1b-fp16", "qwen-7b", "quant"),
    ("qwen-7b", "llama1b-q8", "llama8b-q4", "swap"),
    ("llama8b-q4", "qwen-7b", "llama1b-q8", "swap"),
    ("llama1b-q8", "qwen-7b", "llama8b-q4", "swap"),
    ("llama1b-q8", "llama8b-q4", "qwen-7b", "swap"),
    ("llama8b-q4", "llama1b-q8", "qwen-7b", "swap"),
]


def _outputs(spec, probes, decoding):
    if spec.get("ref"):
        r = load_reference(spec["ref"])
        return r["outputs"] if r else None
    o, _ = run_probes(make_client({"adapter": "ollama", "model": spec["ollama"]}), probes, decoding)
    return o


def calibrate(seed=DEFAULT_SEED, max_tokens=256):
    probes = generate(seed)
    decoding = {"temperature": 0.0, "max_tokens": max_tokens, "seed": 42}
    outs = {k: _outputs(v, probes, decoding) for k, v in CALIB.items()}

    rows = []
    for served, trusted, decoy, label in PAIRS:
        r = behavioural_binding(outs[served], outs[trusted], outs[decoy])
        pred = "diverge" if r["diverges"] else ("bind" if r["bound"] else "borderline")
        rows.append({"served": served, "trusted": trusted, "decoy": decoy, "label": label,
                     "pred": pred, "sim_trusted": r["sim_trusted"], "sim_decoy": r["sim_decoy"],
                     "margin": r["margin"]})

    quant = [r for r in rows if r["label"] == "quant"]
    swap = [r for r in rows if r["label"] == "swap"]
    fp = [r for r in quant if r["pred"] == "diverge"]        # same model flagged as swap
    detected = [r for r in swap if r["pred"] == "diverge"]   # swap correctly caught
    report = {
        "n_probes": len(probes), "seed": seed,
        "thresholds": {"SIM_TRUST_MIN": verdict.SIM_TRUST_MIN, "SIM_MARGIN": verdict.SIM_MARGIN,
                       "SIM_RATIO": verdict.SIM_RATIO, "SIM_DIVERGE": verdict.SIM_DIVERGE},
        "same_model_pairs": len(quant), "false_positives": len(fp),
        "false_positive_pct": round(100 * len(fp) / len(quant)) if quant else 0,
        "swap_pairs": len(swap), "swaps_detected": len(detected),
        "detection_pct": round(100 * len(detected) / len(swap)) if swap else 0,
        "pairs": rows,
    }
    os.makedirs(RESULTS_DIR, exist_ok=True)
    with open(os.path.join(RESULTS_DIR, "calibration.json"), "w") as f:
        json.dump(report, f, indent=2)
    return report
