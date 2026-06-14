# Test targets

The real confidential / verifiable-inference providers attest.fail will probe
once the harness is built. Vetted by reachability (public API, OpenAI-compat,
attestation exposed, how to get a key), not from memory.

Tags:
- **full** — both inference API and a fetchable attestation are reachable, so
  the whole thesis (probe → fingerprint → verify quote → score) is testable.
- **fidelity** — OpenAI-compatible inference, no attestation claim. Tests model
  identity only ("do you serve the model you advertise, or a quantised one?").
- **anchor** — our own access, friendly, likely PASS.
- **verify** — real project, but the live public endpoint / key flow wasn't
  confirmed in one pass. Check before committing.
- **skip (v1)** — real, but not a turnkey probe target yet.

---

## full — test now (attestation + model identity)

### RedPill (Phala)  — first build target
- OpenAI-compatible. Base `https://api.redpill.ai/v1`, `POST /v1/chat/completions`,
  `Authorization: Bearer <key>`.
- Attestation is a real flow: `GET /v1/signature/{request_id}` → recover signing
  address → `GET /v1/attestation/report` (same model, fresh nonce). This is
  exactly Surface A.
- 50+ open models (DeepSeek V3, Qwen, GLM-4) in TDX-attested enclaves.
- Key: `redpill.ai/dashboard`, pay-as-you-go (a few dollars of credit).

### Tinfoil
- OpenAI-compatible, open-source models, NVIDIA H100 CC + AMD SEV.
- Remote-attestation verification center (in-browser at `chat.tinfoil.sh`).
- Access: ~$20/mo plan with API access. No clear free tier.

---

## fidelity — test now (model identity only, we hold ground truth)

All OpenAI-compatible, easy keys, good for the quantisation/identity axis.

| provider | base URL | access |
|---|---|---|
| **Groq** | `https://api.groq.com/openai/v1` | free tier — start here |
| **Together** | `https://api.together.xyz/v1` | signup credits |
| **Fireworks** | `https://api.fireworks.ai/inference/v1` | signup |
| **DeepInfra** | `https://api.deepinfra.com/v1/openai` | signup |
| **OpenRouter** | `https://openrouter.ai/api/v1` | has free models |
| **Hyperbolic** | `app.hyperbolic.ai` | card/crypto credits; PoSP not exposed per-request, so fidelity-only for now |

---

## anchor — our access

- **EigenAI Gateway** — Intel TDX. We build on it.
- **Darkbloom** — Apple secure-enclave inference (Eigen `d-inference`).

---

## verify — real, confirm endpoint first

Real projects, but the open public API + key flow wasn't confirmable in one
pass (expired certs / 403 / vague landing pages). ~10 min each to check.

- **Atoma** — `docs.atoma.ai`
- **NEAR AI Cloud** — `docs.near.ai`
- **0G Compute** — TEEML + opML/zkML
- **Secret AI** — Secret Network, SGX
- **Oasis** — ROFL / Sapphire confidential
- **Edgeless Continuum AI** — SEV-SNP + H100 CC

---

## skip (v1)

- **Marlin Oyster** — confidential VMs, not a hosted chat API.
- **ORA (opML)**, **Lagrange / Mira / Fortytwo**, **EZKL** — proof/consensus
  layers, a different verification surface than a TEE quote. Second board, later.

---

## Launch roster

Replaces the placeholder rows (Nimbus / VaultCompute / OracleMind / PrivAI):

- attestation axis: `EigenAI · Darkbloom · RedPill · Tinfoil`
- fidelity axis: `Groq · Together · Hyperbolic`

### Note on the model column
Real confidential-inference providers serve **open weights** (Llama, DeepSeek,
Qwen, GLM), not GPT/Claude, because attestable inference needs models they can
load. The board's model column should reflect the real served models. That also
sharpens the verdict: open weights means we can hold an unimpeachable local
reference.

## Keys needed to start
A gitignored `.env` with:
- `REDPILL_API_KEY` (a few $ credit) — the full-thesis target.
- `GROQ_API_KEY` (free) — the fidelity target with our own ground truth.
