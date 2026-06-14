"""Probe suite. A large, deterministic POOL of probes, of which each run samples
an unpredictable subset keyed by a fresh per-run nonce. The pool is public, but a
provider cannot know in advance which probes a given run will use, so it cannot
serve the real model for the test set and a cheaper one elsewhere — whitelisting
the test becomes whitelisting the whole pool. References are built over the full
pool; a run compares the sampled subset against the reference's outputs for the
same pool positions.
"""
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
_CONCEPT_T = [
    ("metaphor", "Give a single metaphor for %s, in under six words."),
    ("summary", "Summarise the idea of %s in exactly three words."),
]
_THING_T = [
    ("style", "Write the opening line of a poem about %s. One line only."),
    ("describe", "Describe %s in exactly five words."),
    ("story", "Give a six-word story involving %s."),
]


def generate(seed=0):
    """The full probe POOL (deterministic). ~60 probes; references cover all of
    them and each run samples a subset. `seed` only orders the parametric part."""
    pool = [{"id": i, "category": c, "prompt": p} for i, c, p in FIXED]
    rng = random.Random(seed)
    concepts = _CONCEPTS[:]
    things = _THINGS[:]
    rng.shuffle(concepts)
    rng.shuffle(things)
    for ci, c in enumerate(concepts):
        for cat, tpl in _CONCEPT_T:
            pool.append({"id": "c-%s-%s" % (cat, c.replace(" ", "_")), "category": cat, "prompt": tpl % c})
    for ti, t in enumerate(things):
        for cat, tpl in _THING_T:
            pool.append({"id": "t-%s-%d" % (cat, ti), "category": cat, "prompt": tpl % t})
    return pool


def sample(pool, k, nonce):
    """Pick k probes from the pool, deterministic in `nonce` (so it can be revealed
    and re-checked) but unpredictable before the run. Returns (probes, indices)."""
    k = min(k, len(pool))
    idx = sorted(random.Random(str(nonce)).sample(range(len(pool)), k))
    return [pool[i] for i in idx], idx


def suite_commit(seed=0):
    blob = json.dumps({"suite": SUITE_VERSION, "pool": generate(seed)}, sort_keys=True).encode()
    return "sha256:" + hashlib.sha256(blob).hexdigest()
