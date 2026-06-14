# attest.fail — System Design

Engineering design and build plan. The [README](./README.md) is the pitch. This is how it actually
works, what is rigorous, what is statistical, what is impossible, and the order to build it in.

Status: design. Nothing here is built yet. Numbers in the UI are illustrative.

---

## 0. The honest feasibility boundary

Read this first. It decides everything downstream.

attest.fail makes one hard claim: that it can catch a confidential-inference provider serving a
different model than the one it attests. That claim is partly rigorous and partly statistical, and a
design that pretends otherwise is a liability.

**What is rigorous (cryptographic, near-certain):**
- Whether an attestation exists, verifies to a hardware-vendor root, is fresh, and is bound to the
  endpoint you actually talked to.
- Whether the attested measurement provably binds a known model, given a reproducible build. For most
  providers today the answer is "it does not," and that finding alone is worth publishing.

**What is statistical (calibrated confidence, real error bars):**
- Whether the model answering your prompts is the model claimed. We detect model-family swaps and
  heavy quantization with high confidence. We detect size swaps (70B served as 8B) with high
  confidence. We cannot certify exact precision (fp16 vs int8 of the same weights is often
  behaviourally invisible), so we report a **minimum detectable difference**, not a clean bit.

**What is impossible, and we will say so:**
- Proving a negative with certainty from behaviour alone. A provider who serves the real model only
  on inputs it recognises as ours, and a cheap model otherwise, can evade a static probe set. We
  fight this with held-out, freshly generated, pre-committed probes, and we treat it as an arms race,
  the way every benchmark does.

The strongest, most defensible verdict is the fusion: a valid attestation that provably does **not**
bind the model, plus behaviour that diverges from the claimed model past a pre-registered threshold.
Either signal alone is weaker. Together they are hard to argue with.

---

## 1. The two verification surfaces

### Surface A — Attestation (cryptography)

A TEE attestation proves a specific image booted inside a genuine enclave. The open question is
always: **does that measurement cover the model weights?** Three cases:

1. **Weights measured into the boundary** (baked into the image hashed in MRTD / MRENCLAVE). The
   attestation binds the model, but only if the provider publishes the expected measurement *and* a
   reproducible build so we can independently recompute it. Otherwise the measurement is an opaque
   hash we cannot map to a model identity.
2. **Weights loaded at runtime** from outside the measured boundary (mounted volume, fetched
   registry). The attestation covers the loader, not the weights, unless the loader is audited to
   verify a weight hash. Usually it is not.
3. **No real attestation.** Self-asserted "confidential." Trivially unbindable.

Surface A produces a structured verdict per provider: present, signature valid, root trusted, fresh,
channel-bound, and the decisive `bindsModel ∈ {yes, no, unknown}`.

### Surface B — Behavioural fingerprinting (statistics)

We infer which weights answered by how they answer. Signals, strongest first:

- **Log-probability divergence.** On a fixed battery of prompts at temperature 0, compare the served
  model's next-token distribution against a reference fingerprint. Quantization shifts logprobs
  measurably; a different family shifts them a lot. Requires the API to expose logprobs (many do).
- **Knife-edge greedy canaries.** Prompts where the reference model's top-1 and top-2 tokens are
  nearly tied. Quantization flips the argmax on these. The flip rate is a sensitive precision probe
  and needs only the output text, no logprobs.
- **Capability / size probes.** Tasks where a larger model clearly wins. A served small model
  underperforms past natural variance. Coarse, but robust to most evasions.
- **Refusal-boundary and format fingerprints.** Where exactly a model declines, its unprompted
  style, tokenizer artefacts on rare unicode and leading spaces. Weak alone, useful in aggregate.
- **Latency side-channel.** Tokens/sec and time-to-first-token track model size and hardware. A 3B
  cannot cheaply masquerade as a 70B in compute cost. Corroborating only; batching confounds it.

Every Surface B verdict carries a p-value, a confidence band, and the minimum difference the run was
powered to detect.

---

## 2. Architecture

```
                          ┌──────────────────────────┐
   provider manifest ───► │  Provider Registry        │
   (submitted)            └────────────┬─────────────┘
                                       │
   pre-committed seed ────►  ┌─────────▼─────────┐      ┌────────────────────┐
   (hash published)         │   Scheduler /      │◄────►│  Probe Suite        │
                            │   Cycle runner      │      │  (parametric, seeded)│
                            └─────────┬───────────┘      └────────────────────┘
                                      │
                  ┌───────────────────┼────────────────────┐
                  ▼                   ▼                     ▼
        ┌──────────────────┐ ┌────────────────┐ ┌─────────────────────┐
        │ Attestation      │ │ Probe Runner /  │ │ Reference Registry   │
        │ Verifier         │ │ Harness         │ │ (fingerprints)       │
        │ (per TEE vendor) │ │ (calls endpoint)│ └─────────┬───────────┘
        └────────┬─────────┘ └───────┬─────────┘           │
                 │                   │                      │
                 │            raw transcripts               │
                 │            (hashed, stored)              │
                 ▼                   ▼                      ▼
                      ┌──────────────────────────────┐
                      │      Scoring Engine           │
                      │  (deterministic, statistical) │
                      └──────────────┬───────────────┘
                                     ▼
                      ┌──────────────────────────────┐
                      │  Results store + static JSON  │──► site (index.html)
                      └──────────────────────────────┘
```

No chain anywhere, by design. The integrity anchor is reproducibility: open harness, pinned probes,
hashed transcripts, deterministic scoring, signed results.

---

## 3. Components

### 3.1 Probe Suite
A versioned library. A probe is `{prompt, decodingParams, evaluator, category}`. Probes are
**parametrically generated from a seed**, not hand-written constants, so every cycle gets fresh
instances drawn from a large family and a provider cannot pre-compute answers. Categories map to the
Surface B signals above. The suite version is pinned into every run.

### 3.2 Reference Registry
A reference fingerprint per claimed model: logprob distributions, canary expected outputs, capability
scores, with provenance and a timestamp.
- **Open-weights models** (Llama and similar): references are re-derivable by anyone running the
  weights. This is the gold path and the basis of calibration.
- **Closed models** (gpt-class, claude-class): we cannot self-host, so the reference is the model's
  **first-party API**, captured with a timestamp. The claim becomes "this confidential endpoint
  behaves differently from the first-party API of the model it names." Weaker, still meaningful.
- References are re-derived on a schedule because real models drift and update under you.

### 3.3 Attestation Verifier
One verifier per TEE vendor, behind a common interface returning an `AttestationReport`:
- **Intel TDX** (EigenCompute-class): fetch TD quote, verify the PCK cert chain to the Intel root via
  DCAP/QVL, check TCB status, parse MRTD/RTMR, check REPORTDATA binds the serving TLS key, check
  nonce freshness.
- **NVIDIA Confidential Computing** (H100/H200): verify the GPU attestation report to the NVIDIA root,
  and require it to be **composed** with the host CPU-TEE quote. This is the real frontier for
  verifiable GPU inference and gets first-class support.
- **AMD SEV-SNP**, **AWS Nitro**, **Apple Secure Enclave** (Darkbloom-class): same shape, vendor
  roots and measurement formats differ.

The verifier never decides model identity by itself. It decides attestation strength and the
`bindsModel` question, then hands off.

### 3.4 Probe Runner / Harness
Drives an endpoint over its API (OpenAI-compatible assumed, adapters for others). Controls decoding
(temperature 0, top_p 1, fixed max tokens, request logprobs and seed when supported), handles rate
limits and retries, and records **everything**: request, response, logprobs, latency, the TLS cert
seen, and the attestation fetched *in the same session* so the probed endpoint and the attested
endpoint are provably the same thing.

### 3.5 Scoring Engine
Deterministic. Raw transcripts plus reference plus attestation report in, scores and verdict out.
- Each signal yields a test statistic with a **null distribution measured from genuine-vs-genuine
  runs** (the same model against itself across sessions and time, which captures sampling and
  hardware nondeterminism).
- Thresholds are **pre-registered** to control the false-accusation rate (for example the 99.9th
  percentile of the null, for a 0.1% per-signal false-positive target).
- A **FAIL requires at least two independent signal categories to agree.** Per-signal p-values are
  combined with Fisher's method against a pre-registered alpha. This controls the family-wise rate of
  falsely accusing an honest provider, which is the failure mode that ends the project.
- Output: per-signal scores, an overall 0–100, a verdict, a confidence band, the minimum detectable
  difference, and which probes drove the call.

### 3.6 Transcript store + hashing
Every probe transcript is canonicalised and `sha256`-hashed. A run publishes a Merkle root over its
transcripts, so a provider can point to and dispute a single probe without us revealing the whole set
early. Results are signed with the project key. That is the entire integrity story and it needs no
external system to verify.

### 3.7 Results API + site
Static JSON per cycle, consumed by `index.html`. Historical cycles drive the trajectory chart. Schema
in §4.

### 3.8 Provider Registry / Submission
The "Submit an endpoint" flow. A provider posts a manifest (§4) declaring endpoint, claimed models,
TEE type, expected measurements, and ideally a reproducible-build recipe. Without the recipe the
provider can still be probed, it just cannot earn a `bindsModel: yes`.

### 3.9 Scheduler / cycles
Periodic runs. Each cycle: pre-commit the probe seed (publish its hash), generate fresh probes, run
every provider, score, sign, publish, append to the trajectory, then **reveal** the seed and
transcripts. The pre-commit is a plain published hash, the commit-reveal half of a scheme attest.fail
runs on itself.

---

## 4. Data schemas

**Provider manifest** (submitted):
```json
{
  "id": "oraclemind",
  "displayName": "OracleMind API",
  "endpoint": "https://api.oraclemind.ai/v1",
  "apiStyle": "openai-chat",
  "auth": { "type": "bearer", "secretRef": "env:ORACLEMIND_KEY" },
  "claims": [
    { "requestModel": "om-pro", "attestedModel": "gpt-class-mini", "modelFamily": "gpt-class" }
  ],
  "attestation": {
    "type": "intel-tdx",
    "quoteEndpoint": "https://api.oraclemind.ai/v1/attestation",
    "expectedMeasurements": { "MRTD": "0x…", "RTMR1": "0x…" },
    "reproducibleBuild": { "repo": "…", "ref": "…", "recipe": "…" }
  },
  "decoding": { "temperature": 0, "top_p": 1, "max_tokens": 256, "logprobs": true }
}
```

**Run record** (internal, hashed and published post-cycle):
```json
{
  "runId": "run_2841_oraclemind",
  "cycle": 2841,
  "providerId": "oraclemind",
  "suiteVersion": "probe-suite@1.4.0",
  "refVersion": "ref-registry@2026.06",
  "seedCommit": "sha256:…",
  "seedReveal": "0x…",
  "startedAt": "…", "endedAt": "…",
  "endpointTlsCert": "sha256:…",
  "attestation": { "...": "AttestationReport" },
  "probes": [
    { "probeId": "kc_0007", "category": "knife-edge", "input": "…",
      "params": {}, "output": "…", "logprobs": [], "latencyMs": 0,
      "transcriptHash": "sha256:…" }
  ],
  "transcriptMerkleRoot": "sha256:…"
}
```

**Result record** (what the site consumes):
```json
{
  "cycle": 2841, "providerId": "oraclemind", "displayName": "OracleMind API",
  "attestation": {
    "present": true, "signatureValid": true, "rootTrusted": true,
    "freshnessOk": true, "channelBound": true, "bindsModel": false, "score": 38
  },
  "signals": {
    "modelMatch": { "score": 52.3, "pValue": 1e-4, "confidence": "high",
                    "minDetectableDelta": "int8", "detail": "~8B distill profile" },
    "substitution": { "detected": true, "type": "size-swap→~8B", "categoriesAgreeing": 3 },
    "reasoning": { "intact": false, "truncationRate": 0.61 }
  },
  "score": 29, "verdict": "fail",
  "evidence": { "runId": "run_2841_oraclemind", "merkleRoot": "sha256:…", "seedReveal": "0x…" },
  "disclosure": { "notifiedAt": "…", "providerResponse": "disputed", "publishedAt": "…" }
}
```

---

## 5. Calibration & validation (the part that makes it a benchmark)

Before attest.fail points at anyone real, it has to prove its own detector. We stand up a
**ground-truth testbed**: our own OpenAI-compatible endpoints serving known models we control. Full
precision, int8, int4, a smaller sibling, a different family, all labelled. Then we measure the
detector's operating characteristics:

- True-positive rate per substitution type at a fixed 0.1% false-positive rate.
- The minimum detectable difference per signal (where does fp16-vs-int8 detection fall apart).
- The genuine-vs-genuine null variance that sets every threshold.

We publish these ROC curves. They are the difference between a benchmark and a vibe. A FAIL verdict
without a published false-positive rate behind it is defamation, so this workstream gates any public
accusation.

---

## 6. Adversarial model

Assume providers read this repo.

- **Probe memorisation / special-casing.** Beaten by parametric, seeded probes generated fresh each
  cycle and pre-committed by hash, revealed only after the cycle closes. A provider cannot answer
  probes it has not seen, and anyone can later verify the probes were fixed in advance.
- **Detect-the-benchmark-and-switch.** Probes are drawn to look like ordinary traffic, and we vary
  IPs and timing. We never claim full immunity here. We claim we raise the cost and we log our blind
  spots.
- **Attestation replay / stale quotes.** Beaten by nonce freshness and channel binding to the live
  TLS key.
- **Gaming the reference.** Closed-model references are re-derived on a schedule and timestamped so a
  provider cannot exploit reference drift.

---

## 7. Governance, disclosure, ethics

Naming a company as serving a fraudulent model is serious and we treat it that way.

- **"Insufficient evidence" is a valid outcome.** We never force a verdict to fill a cell.
- **Responsible disclosure window.** A provider trending toward FAIL is notified privately and given a
  fixed window to respond or contest before the result is public. The result record carries the
  disclosure trail.
- **Reproducible accusations.** Every FAIL ships with the run id, the Merkle root, the revealed seed,
  and the method, so the accused can reproduce and dispute it exactly.
- **Conflict of interest.** attest.fail audits the verifiable-AI market, which includes providers it
  may otherwise be friendly with. The calibration data and thresholds are public precisely so the
  benchmark cannot quietly favour anyone.

---

## 8. Tech stack

Chosen to match existing muscle memory and the shape of the problem.

- **Core (probes, scoring, attestation): Python.** numpy/scipy for the statistics, vendor DCAP/QVL
  bindings (or a shelled-out verifier) for TDX, NVIDIA's attestation SDK for GPU CC.
- **Storage: Postgres** for run and result records, **Redis** for the probe job queue. (Same spine as
  Model Card Explorer, so the operational patterns are already known.)
- **Service: a small FastAPI** serving signed results JSON.
- **Site: the existing static `index.html`.** No build step.
- **Scheduler: a cron-driven worker** for cycles.

Repo layout stays flat and domain-named:
```
attest-fail/
  probes/         parametric probe families + generators
  references/     reference registry + derivation jobs
  attestation/    per-vendor verifiers (tdx, nvidia, sev-snp, nitro, apple)
  harness/        probe runner, endpoint adapters
  scoring/        statistics, null distributions, fusion, thresholds
  results/        signed result JSON, cycle history
  site/           index.html and assets
  README.md  DESIGN.md
```

---

## 9. Roadmap

**Phase 0 — Calibration rig (build this first).**
Ground-truth testbed of self-served known models. Logprob-divergence and knife-edge probes against
open-weights references. Measure and publish ROC. Deliverable: "we can tell int4, a size swap, and a
family swap apart at a known false-positive rate." Until this exists, attest.fail accuses no one.

**Phase 1 — One real surface, end to end.**
Intel TDX attestation verifier with the `bindsModel` determination. OpenAI-compatible harness.
Deterministic scoring with pre-registered thresholds and two-category fusion. Commit-reveal seed,
transcript hashing, signed results JSON wired into the live site. One honest provider and one
deliberately-swapped provider, both scored correctly.

**Phase 2 — Coverage and the submission portal.**
NVIDIA composite GPU+CPU attestation. Closed-model references via first-party APIs. Capability/size
and latency signals. Provider manifest submission flow. Responsible-disclosure workflow.

**Phase 3 — Hardening and scale.**
Rotating parametric probe families, public reproduction CI (anyone re-runs a past cycle and matches
the published verdict), broader provider coverage, confidence/MDD reporting matured to production.

---

## 10. Open problems (named, not hidden)

- **Closed-model references rest on a first-party API** that could itself be swapped. We can only ever
  say "differs from first-party behaviour," not "differs from ground truth." Honest and unavoidable.
- **fp16-vs-int8 of identical weights may be undetectable** on most prompts. We report the limit
  rather than overclaim a verdict.
- **A provider that recognises our traffic and serves the real model only to us** is the hard ceiling.
  Fresh pre-committed probes raise the cost; nothing makes it zero.
- **Attestation that does not measure the model is the common case today.** Our most frequent finding
  will be "valid seal, unbound model," which is less cinematic than a caught swap and more important.
```
