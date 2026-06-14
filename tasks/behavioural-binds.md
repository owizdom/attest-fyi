# Task: behaviourally bind the large TEE models   (id: behavioural-binds)

- **Status:** open — blocked on compute (needs a machine that can run 27B–122B references)
- **Type:** behavioural binding
- **Credit:** your GitHub avatar on every verdict you lift

> Read https://attest.fyi/llms.txt first for how behavioural binding works.

## Mission
Several providers have a fully verified seal but an **unbound model**, only
because the machine that ran them could not host a big enough reference to
compare against. Bind them and lift them from **partial** toward **pass**.

## The unbound models
- **NanoGPT** — `TEE/qwen3.6-27b` (Intel TDX + NVIDIA Blackwell seal verified).
- **Chutes** — `Qwen/Qwen3-32B-TEE` (same Chutes infra; seal reachable).
- **NEAR AI** — its open models are 27B–122B (DeepSeek, Qwen), all too large to
  reference locally on a laptop.

Each currently scores on the seal alone. With a trusted reference of the same
open weights + a decoy, `scoring/verdict.py` can decide whether the served model
behaviourally matches — turning a seal-only **partial** into a **pass** when it
binds (or a **fail** if a provider is quietly swapping a smaller model, which
would be the most important finding on the whole board).

## Done means
- For a target model, build a trusted reference and a decoy:
  `attest.py build-ref --adapter ollama --model <the-real-open-weights>` and a
  smaller decoy. Commit them to `references/store/`.
- Add a `reference` block to that provider's manifest pointing at the new refs.
- Run a cycle with the provider's key; record the verdict + evidence.
- Honest finding: did it bind, drift, or swap?

## Continue from here
Nothing started — this is purely a hardware gate. You need enough VRAM/RAM to run
the reference models at temperature 0 (a 27B at q4 needs ~20GB; a 70B+ needs a
real GPU box or a trusted big-model host). The probe suite is seeded and
deterministic, so a reference built on adequate hardware is portable. Start with
the smallest unbound target (qwen3.6-27b / Qwen3-32B), prove the flow, then
scale up to the 70B–122B NEAR models.

## Submit
One PR per provider you bind, titled `task: behavioural-binds — bind <provider>`,
with the new reference(s) under `references/store/` and evidence under
`results/evidence/`. Sign each with `verify: <provider-id>`.
