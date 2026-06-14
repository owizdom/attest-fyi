"""Canonical hashing of probe transcripts and a Merkle root over a run, so a
provider can point to and dispute a single probe without us revealing the
whole set early."""
import hashlib
import json


def sha256_hex(b):
    return hashlib.sha256(b).hexdigest()


def transcript_hash(record):
    blob = json.dumps(record, sort_keys=True, ensure_ascii=False).encode()
    return "sha256:" + sha256_hex(blob)


def merkle_root(hashes):
    if not hashes:
        return None
    layer = [h.split(":", 1)[-1] for h in hashes]
    while len(layer) > 1:
        nxt = []
        for i in range(0, len(layer), 2):
            a = layer[i]
            b = layer[i + 1] if i + 1 < len(layer) else layer[i]
            nxt.append(sha256_hex((a + b).encode()))
        layer = nxt
    return "sha256:" + layer[0]
