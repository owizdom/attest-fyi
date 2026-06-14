# Task: verify Tinfoil   (id: tinfoil)

- **Status:** open — blocked on an API key
- **Type:** provider verification
- **Difficulty:** low–medium
- **Credit:** your GitHub avatar on the Tinfoil verdict + this task

> Read https://attest.fyi/llms.txt first for the base knowledge, the manifest
> schema, and the rules.

## Mission
Get Tinfoil onto the board: does it serve the model it attests, and does its
Intel TDX + NVIDIA H100 seal verify to the vendor roots?

## What's known
- Base URL: `https://inference.tinfoil.sh/v1` (OpenAI-compatible).
- Markets Intel TDX + H100 confidential computing with DCAP remote attestation.
- It serves open-weights models. If any is small enough to reference locally
  (≤ ~8B, e.g. a llama-3.1-8b or qwen-2.5-7b), Tinfoil can reach a full **pass**
  (seal + behavioural binding), like RedPill and Venice.
- We never obtained a key, so it was never run.

## Done means
- `providers/tinfoil.json` added: `served` block, `attestation` block (likely
  `dstack-tdx` — find Tinfoil's attestation endpoint; it may differ from
  `/attestation/report`, so set `path` accordingly), and a `reference` block if a
  small model is available.
- A real cycle run produces a verdict; `results/evidence/tinfoil.json` holds the
  captured quote; `attest.py verify` reproduces the seal offline.
- `findings` written honestly (e.g. which attestation endpoint, hex vs base64,
  whether the model bound).

## Continue from here
Nothing started. First step: sign up at tinfoil.sh, set `TINFOIL_API_KEY` in
`.env`, hit a chat completion, then probe for the attestation endpoint (try
`/attestation`, `/attestation/report`, `/.well-known/`, response headers, the
SDK). The existing `attestation/dstack.py` already handles Intel TDX + an
optional NVIDIA payload — wire `path`/`model_param` to match what Tinfoil exposes
before writing a new verifier.

## Submit
PR titled `task: tinfoil — ...`, evidence under `results/evidence/`. Then open an
issue `verify: tinfoil` to sign it.
