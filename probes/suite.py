"""Probe suite: a fixed divergence battery plus a seeded parametric expansion,
with a commit hash so a cycle can publish the commitment before running and
reveal the seed after (the commit-reveal the design calls for)."""
import hashlib
import json
import random

from config import SUITE_VERSION

FIXED = [
    ("fx01", "style", "Continue with exactly the next eight words, nothing else: "
                      "'In the quiet hours before the storm'"),
    ("fx02", "style", "Write the opening line of a poem about an empty train station. One line only."),
    ("fx03", "metaphor", "Give a single metaphor for trust, in under six words."),
    ("fx04", "knowledge", "Name a colour that is not in the rainbow. One word only."),
    ("fx05", "naming", "Invent a one-word name for a startup that audits AI. One word, no explanation."),
    ("fx06", "completion", "Finish this sentence in five words exactly: 'The seal was valid but'"),
    ("fx07", "rhyme", "Give one word that rhymes with 'silver'."),
    ("fx08", "explain", "In one short sentence, explain why the sky is blue."),
    ("fx09", "analogy", "Complete the analogy with one word: key is to lock as password is to ____"),
    ("fx10", "summary", "Summarise the idea of trust in exactly three words."),
    ("fx11", "story", "Write a six-word story about a broken promise."),
    ("fx12", "adjective", "Pick an adjective to describe the colour of rust. One word."),
]

_CONCEPTS = ["trust", "secrecy", "decay", "memory", "distance", "silence",
             "speed", "doubt", "loyalty", "ruin", "dawn", "machinery"]
_THINGS = ["a locked door", "an empty harbour", "a dead battery", "a cold engine",
           "a sealed letter", "a broken clock", "a foggy mirror", "a quiet server"]


def generate(seed, n_param=12):
    """Return [{id, category, prompt}], deterministic in `seed`."""
    rng = random.Random(seed)
    probes = [{"id": i, "category": c, "prompt": p} for i, c, p in FIXED]
    concepts = _CONCEPTS[:]
    things = _THINGS[:]
    rng.shuffle(concepts)
    rng.shuffle(things)
    for k in range(n_param):
        if k % 2 == 0:
            prompt = "Give a single metaphor for %s, in under six words." % concepts[k % len(concepts)]
            cat = "metaphor"
        else:
            prompt = "Write the opening line of a poem about %s. One line only." % things[k % len(things)]
            cat = "style"
        probes.append({"id": "pg%02d" % k, "category": cat, "prompt": prompt})
    return probes


def suite_commit(seed, n_param=12):
    blob = json.dumps({"suite": SUITE_VERSION, "seed": seed,
                       "probes": generate(seed, n_param)}, sort_keys=True).encode()
    return "sha256:" + hashlib.sha256(blob).hexdigest()
