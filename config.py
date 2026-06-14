"""Shared configuration and paths for the attest.fail engine.

Run everything from the repo root so the flat domain packages (models, probes,
harness, references, attestation, scoring, cycle, web) import each other.
"""
import os
import re

SUITE_VERSION = "0.1.0"
DEFAULT_SEED = 1729

ROOT = os.path.dirname(os.path.abspath(__file__))
PROVIDERS_DIR = os.path.join(ROOT, "providers")
RESULTS_DIR = os.path.join(ROOT, "results")
REF_STORE_DIR = os.path.join(ROOT, "references", "store")
WEB_INDEX = os.path.join(ROOT, "web", "index.html")


def load_key(name, dotenvs=()):
    """Resolve a secret from env, then local .env files. Never logged."""
    if not name:
        return None
    v = os.environ.get(name)
    if v:
        return v
    paths = list(dotenvs) + [
        os.path.join(ROOT, ".env"),
        os.path.expanduser("~/Desktop/ai-research-model-cards/.env"),
    ]
    for p in paths:
        if os.path.exists(p):
            for line in open(p):
                m = re.match(r"\s*" + re.escape(name) + r'\s*=\s*["\']?([^"\'\s]+)', line)
                if m:
                    return m.group(1)
    return None
