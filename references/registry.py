"""Build and store reference fingerprints. A reference is the claimed model's
own behaviour on the probe suite, plus its measured null (the model against
itself), since every threshold sits relative to that null."""
import json
import os
import re

from config import REF_STORE_DIR, SUITE_VERSION
from harness.runner import run_probes
from scoring.metrics import exact_rate, sim_rate


def _slug(model_id):
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", model_id).strip("-")


def ref_path(model_id):
    return os.path.join(REF_STORE_DIR, _slug(model_id) + ".json")


def build_reference(client, probes, decoding, model_id, seed):
    """Run the model twice: once for the reference outputs, once to measure the
    null (its self-agreement). Persist and return the record."""
    out1, rec1 = run_probes(client, probes, decoding)
    out2, _ = run_probes(client, probes, decoding)
    ref = {
        "model_id": model_id,
        "suite_version": SUITE_VERSION,
        "seed": seed,
        "decoding": decoding,
        "outputs": out1,
        "null_exact": round(exact_rate(out1, out2), 4),
        "null_sim": round(sim_rate(out1, out2), 4),
        "errors": rec1["errors"],
        "merkle_root": rec1["merkle_root"],
    }
    os.makedirs(REF_STORE_DIR, exist_ok=True)
    json.dump(ref, open(ref_path(model_id), "w"), indent=2)
    return ref


def load_reference(model_id):
    p = ref_path(model_id)
    return json.load(open(p)) if os.path.exists(p) else None
