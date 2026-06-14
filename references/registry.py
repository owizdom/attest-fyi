"""Build and store reference fingerprints. A reference is the claimed model's
own behaviour on the probe suite, plus its measured null (the model against
itself), since every threshold sits relative to that null."""
import json
import os
import re
import urllib.request

from config import REF_STORE_DIR, SUITE_VERSION
from harness.runner import run_probes
from scoring.metrics import exact_rate, sim_rate


def _slug(model_id):
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", model_id).strip("-")


def ref_path(model_id):
    return os.path.join(REF_STORE_DIR, _slug(model_id) + ".json")


def ollama_digest(model, host="http://localhost:11434"):
    """The content digest Ollama reports for a model — pins the exact weights so
    a reference is anchored to a hash anyone can match, not 'trust us'."""
    try:
        d = json.load(urllib.request.urlopen(host.rstrip("/") + "/api/tags", timeout=10))
        for m in d.get("models", []):
            if m.get("name") == model:
                return m.get("digest")
    except Exception:
        return None
    return None


def build_reference(client, probes, decoding, model_id, seed, source=None):
    """Run the model twice: once for the reference outputs, once to measure the
    null (its self-agreement). Records the source weights' digest so the ground
    truth is anchored. Persist and return the record."""
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
    if source:
        src = {k: source[k] for k in ("adapter", "model", "host") if source.get(k)}
        if src.get("adapter") == "ollama" and src.get("model"):
            dg = ollama_digest(src["model"], src.get("host") or "http://localhost:11434")
            if dg:
                src["digest"] = dg
        ref["source"] = src
    os.makedirs(REF_STORE_DIR, exist_ok=True)
    json.dump(ref, open(ref_path(model_id), "w"), indent=2)
    return ref


def load_reference(model_id):
    p = ref_path(model_id)
    return json.load(open(p)) if os.path.exists(p) else None


def verify_reference(model_id, seed):
    """Reproducibility check: rebuild the reference from its recorded source and
    diff against the stored outputs. Returns match stats + whether the source
    digest still matches. Proves a reference is the weights it claims, not ours."""
    from models.factory import make_client
    ref = load_reference(model_id)
    if not ref:
        return {"error": "no such reference"}
    src = ref.get("source")
    if not src:
        return {"error": "reference has no recorded source to rebuild from"}
    client = make_client(src)
    decoding = ref.get("decoding") or {"temperature": 0.0, "max_tokens": 256, "seed": seed}
    from probes.suite import generate
    out, _ = run_probes(client, generate(ref.get("seed", seed)), decoding)
    stored = ref["outputs"]
    n = min(len(out), len(stored))
    matched = sum(1 for i in range(n) if out[i] == stored[i])
    dg_now = ollama_digest(src["model"]) if src.get("adapter") == "ollama" else None
    return {"model": src.get("model"), "digest": src.get("digest"),
            "digest_ok": (not src.get("digest")) or dg_now == src.get("digest"),
            "matched": matched, "total": len(stored)}
