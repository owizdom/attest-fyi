# attest.fail

*Is "verifiable AI" actually verifiable?*

An independent benchmark that checks whether confidential-inference providers really serve the
model they attest. Most of them swear the model that answered you is the model they promised.
Almost no one checks. attest.fail checks.

---

## The problem

The whole "verifiable AI" market rests on one assumption nobody audits: that an attestation tells
you which model answered your request. It doesn't, on its own.

A TEE attestation proves a specific container image booted inside a genuine enclave. That is real
cryptography and it is worth having. But the model weights are often loaded at runtime, streamed in
from outside the measured boundary, or the "attestation" is self-asserted and measures nothing about
the model at all. So a provider can hold a valid quote and still serve you a smaller, quantised, or
distilled engine than the one it named. The seal is genuine. The engine behind it is not.

Nobody sells you that gap. attest.fail measures it.

## What it does

attest.fail probes each confidential-inference endpoint, fingerprints the model actually answering,
audits the attestation against that behaviour, and publishes a standing for every provider. EigenAI,
Darkbloom, and the centralised "confidential AI" APIs all get the same treatment. Honest providers
score high. Silent model swaps get caught and named.

The headline number is the **trust gap**: the share of providers whose served behaviour detectably
disagrees with what they attest. Right now it sits around 41%.

## How it works

Three checks, one verdict.

**I. Fingerprint — which weights answered?**
Challenge prompts engineered so that a swapped, distilled, or quantised engine gives itself away.
We read log-probabilities, canary completions, the exact boundary at which a model declines a
request, and the small arithmetic tells of reduced precision. Where conduct and claim disagree, the
claim loses.

**II. Audit — does the seal hold?**
Verify the TDX / SGX / Secure-Enclave quote and image digest against the registry, then weigh it
against the observed behaviour. A valid quote wrapped around the wrong engine is the headline fault,
and it is the one a casual buyer never sees.

**III. Reproduce — don't trust us, re-run us.**
The harness is open, the probe sets are pinned, and every raw transcript is published and
content-hashed. Re-run it and you land on the same verdict. The scoring is deterministic. That is
the entire integrity guarantee, and for a benchmark it is enough.

## What we measure

| Signal | What it asks |
|---|---|
| **Attestation** | Is there a quote, does it verify, does the image digest match the registry? |
| **Model match** | Does the served behaviour match the attested model's fingerprint? |
| **Substitution** | Is a different engine being served (swapped, distilled, quantised)? |
| **Reasoning** | Is the reasoning delivered intact, or silently truncated at the gateway? |
| **Score** | A single 0–100 roll-up of the above. |

### Verdicts

- **Pass** — quote holds and behaviour matches the attested model.
- **Partial** — seal is valid but the engine is degraded (quantised, truncated reasoning).
- **Fail** — valid-looking quote, wrong engine. Or no real attestation at all.

## Why this matters

Verifiable inference is the load-bearing claim under a lot of crypto-and-AI infrastructure. If that
claim can be faked with a valid seal, the whole category is running on trust it hasn't earned. An
independent auditor fixes that two ways. It gives honest providers a place to prove they are honest,
and it gives everyone else a reason to become honest.

There is also a concentration argument. If "trust me, it's the real model" is the only option, trust
pools into whichever few houses are loudest. A public benchmark that anyone can re-run keeps that
market legible and keeps smaller, honest providers in the game.

The benchmark is willing to find holes in anyone, including providers it might otherwise be friendly
with. That is the point of it.

## What this is not

Behavioural fingerprinting is probabilistic. It cannot always separate two very close model variants,
and a determined provider can make detection harder. So attest.fail reports **confidence, not
certainty**, and it publishes its own blind spots and false-positive characteristics alongside the
scores. A benchmark that pretends to perfect detection is lying, and lying is the thing this project
exists to catch.

### Why no on-chain log?

An earlier sketch committed every run to a data-availability layer. We cut it. A benchmark earns
trust by being reproducible, not by posting receipts to a chain. Open harness, pinned probes, hashed
transcripts, deterministic scoring: re-run it and check for yourself. Adding a DA dependency would
have bought credibility we can get for free, and asked readers to trust a second system to verify the
first.

## Status

Prototype. The numbers and providers in the UI are illustrative while the probe suite is built out.

## This repo

Flat domain folders, run from the root. Stdlib only, no pip install.

```
attest-fail/
  attest.py        CLI entrypoint
  config.py        paths, suite version, key loading
  models/          provider adapters (openai-compat, ollama, gemini)
  probes/          fixed battery + seeded parametric suite (+ commit hash)
  harness/         probe runner + transcript hashing (merkle)
  references/      reference fingerprints (code + store/)
  attestation/     per-vendor verifiers (none, redpill, ...)
  scoring/         metrics + verdict logic
  cycle/           orchestrates a full benchmark cycle
  web/             the static site (index.html) + builder
  providers/       provider manifests (json)
  results/         generated cycle output + latest.json
  early-experiments/   the Phase-0 validation runs
  README.md  DESIGN.md  TARGETS.md
```

### Run it

```bash
# 1. build a reference fingerprint for a model you trust as ground truth
python3 attest.py build-ref --adapter ollama --model llama3.2:1b-instruct-q8_0

# 2. run a cycle over providers/ (skips any provider whose key is missing)
python3 attest.py run

# 3. (run already rebuilds the site) render it standalone if needed
python3 attest.py build-site
open web/index.html
```

The site stays a single self-contained file: the cycle data is injected into
`web/index.html`, no fetch and no server. Add real providers by dropping their
keys in a gitignored `.env` (`REDPILL_API_KEY`, `GROQ_API_KEY`, ...); see
[TARGETS.md](./TARGETS.md). See [DESIGN.md](./DESIGN.md) for the full system.
