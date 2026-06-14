# Test targets

The real confidential / verifiable-inference providers attest.fail probes, and the open-weights hosts
it fidelity-checks. The confidential set is taken from the public
[Confidential Inference Directory](https://confidentialinference.net/) and cross-checked against each
provider. Every one of these is live and public today.

Tags:
- **attested** — TEE-attested confidential inference, OpenAI-compatible, ships a verifiable attestation.
  These are the true attest.fail targets (both axes: model identity + the seal).
- **fidelity** — OpenAI-compatible open-weights host, no attestation claim. Model-identity axis only
  ("do you serve the model you advertise, or a quantised one?").
- **anchor** — our own access (Eigen ecosystem), friendly.
- **skip / verify** — real but SDK-only, infra, or endpoint unconfirmed.

Status note: probing a confidential provider needs an account + API key (most are paid, a few cents per
million tokens). Manifests for all of these live in `providers/`; a cycle tests whichever keys are
present in `.env` and marks the rest "skipped (no key)".

---

## attested — the confidential-inference market (test now, key needed)

| Provider | Base URL | TEE / attestation | Price (in) | Signup | Models |
|---|---|---|---|---|---|
| **RedPill** (Phala) | `https://api.redpill.ai/v1` | Intel TDX + H100 CC + Phala on-chain | $0.04/M | redpill.ai | 23 |
| **NEAR AI** | `https://cloud-api.near.ai/v1` | Intel TDX + H100 CC, DCAP RA | $0.01/M | cloud.near.ai | 13 |
| **Chutes** | `https://llm.chutes.ai/v1` | AMD SEV-SNP + TDX | $0.02/M | chutes.ai | 12 |
| **Tinfoil** | `https://inference.tinfoil.sh/v1` | Intel TDX + H100 CC, DCAP RA | $0.05/M | tinfoil.sh | 12 |
| **Venice.ai** | `https://api.venice.ai/api/v1` | H100 CC, NVIDIA CC attestation | $0.05/M | venice.ai | 14 |
| **NanoGPT** | `https://nano-gpt.com/api/v1` | H100 CC + per-request ECDSA sigs | $0.13/M | nano-gpt.com | 29 |
| **Privatemode** | `https://api.privatemode.ai/v1` | AMD SEV-SNP + TDX, Cosmian VM | $0.15/M | privatemode.ai | 6 |
| **PPQ.AI** | `https://api.ppq.ai/v1` | AMD SEV-SNP + Tinfoil backend | $0.47/M | ppq.ai | 6 |
| **Maple** | custom | AMD SEV-SNP | custom | trymaple.ai | 0 public |

RedPill is the best first target: cheap, and it exposes the exact `GET /v1/signature/{id}` →
`GET /v1/attestation/report` flow the engine already speaks. NEAR AI and Chutes are the cheapest by token.

Base URLs marked above are best-effort; the confirmed ones are RedPill and Venice. The rest are
verified at integration when a key is added.

### What we actually verified (live, against the real APIs)

The "TEE / attestation" column above is what each provider *markets*. Probing the seals turned up a
gap between that and what is actually checkable:

- **The "AMD SEV-SNP" providers don't serve SEV-SNP.** Chutes is Intel TDX + NVIDIA Blackwell (its own
  quotes say so), and its public API exposes only an opaque `chutes_verification` token, not a
  retrievable quote. PPQ exposes no attestation at all: a bare proxy whose attestation paths return a
  catch-all 404. There was no SEV-SNP quote to verify anywhere in the set.
- **NanoGPT resells Chutes.** Its "H100 + per-request ECDSA" is Intel TDX + NVIDIA Blackwell (GB202);
  the report literally carries `attestation_type: chutes`. The seal verifies across a 5-node fleet.
- **Venice runs on Phala.** Its "verifiable E2EE" is Intel TDX (Phala) + NVIDIA Hopper (GH100), and
  `e2ee-qwen-2-5-7b-p` is plain qwen-2.5-7b upstream. Seal and behaviour both verify, so it earns a Pass.
- **RedPill and NEAR** are dstack/Phala Intel TDX; RedPill also ships an NVIDIA Hopper payload, now
  verified too.

Seals the engine now parses and roots: Intel TDX (hex from dstack gateways, base64 from Chutes) to
Intel's SGX Root CA, and NVIDIA GPU device-identity chains (Hopper and Blackwell) to NVIDIA's Device
Identity CA.

## fidelity — open-weights hosts (no attestation; model-identity test)

All OpenAI-compatible, easy keys, good for the quantisation/identity axis where we hold ground truth.

| Host | Base URL | Access |
|---|---|---|
| **Groq** | `https://api.groq.com/openai/v1` | free tier |
| **Cerebras** | `https://api.cerebras.ai/v1` | free tier (daily limit) |
| **Together** | `https://api.together.xyz/v1` | signup credits |
| **Fireworks** | `https://api.fireworks.ai/inference/v1` | signup |
| **DeepInfra** | `https://api.deepinfra.com/v1/openai` | signup |
| **OpenRouter** | `https://openrouter.ai/api/v1` | has free models |
| **Novita** | `https://api.novita.ai/v3/openai` | signup |
| **SambaNova** | `https://api.sambanova.ai/v1` | signup |
| **Nebius** | `https://api.studio.nebius.ai/v1` | EU, signup |

## anchor — our access (Eigen ecosystem)

- **EigenAI Gateway** — Intel TDX. We build on it.
- **Darkbloom** — Apple secure-enclave inference (Eigen `d-inference`).

## fidelity ground truth we already test (key on disk)

- **Gemini 2.5 Flash** (honest) and **Gemini → Flash-Lite** (honeypot swap) via the Google API.
- **Local Ollama** honest (q8) and swapped (q4) controls.

## skip / verify

Real, but SDK-only, infra, or a different verification surface (proofs, not a TEE quote): **Atoma**,
**0G Compute**, **Super Protocol**, **Oasis ROFL**, **Secret AI**, **Nillion nilAI**, **Marlin Oyster**,
**ORA (opML)**, **Lagrange / Mira / Fortytwo**.

---

## Keys to light up real verdicts

Drop any of these in a gitignored `.env` and re-run `python3 attest.py run`:

```
REDPILL_API_KEY=...     # best: cheap + real attestation the engine verifies
NEAR_AI_API_KEY=...     # cheapest by token ($0.01/M)
CHUTES_API_KEY=...      # cheapest paid ($0.02/M)
GROQ_API_KEY=...        # free, fidelity axis with our own ground truth
CEREBRAS_API_KEY=...    # free
TINFOIL_API_KEY=...  VENICE_API_KEY=...  NANOGPT_API_KEY=...  ...
```

Sources: [Confidential Inference Directory](https://confidentialinference.net/),
[RedPill API](https://docs.redpill.ai/confidential-ai-inference/introduction),
[Phala confidential AI](https://phala.com/confidential-ai-models),
[Tinfoil inference](https://tinfoil.sh/inference), [NEAR AI](https://cloud.near.ai),
[Chutes](https://chutes.ai), [Venice](https://venice.ai).
