"""Run a probe battery against one model client, capturing every transcript
(input, output, latency, error) and committing them to a Merkle root."""
import time
from concurrent.futures import ThreadPoolExecutor

from .transcripts import transcript_hash, merkle_root


def run_probes(client, probes, decoding, workers=2):
    """Returns (outputs, run_record). outputs is a plain list aligned to probes."""
    transcripts = [None] * len(probes)

    def one(i):
        p = probes[i]
        t0 = time.perf_counter()
        out = client.generate(p["prompt"], **decoding)
        dt = int((time.perf_counter() - t0) * 1000)
        rec = {"probe_id": p["id"], "category": p["category"], "prompt": p["prompt"],
               "output": out, "latency_ms": dt,
               "error": out.startswith(("<ERR", "<EMPTY"))}
        rec["hash"] = transcript_hash(rec)
        transcripts[i] = rec

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(one, range(len(probes))))

    outputs = [t["output"] for t in transcripts]
    run_record = {
        "model": getattr(client, "model", "?"),
        "decoding": decoding,
        "request_id": getattr(client, "last_id", None),
        "transcripts": transcripts,
        "merkle_root": merkle_root([t["hash"] for t in transcripts]),
        "errors": sum(1 for t in transcripts if t["error"]),
    }
    return outputs, run_record
