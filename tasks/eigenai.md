# Task: audit EigenAI from inside EigenCompute   (id: eigenai)

- **Status:** open — blocked: the gateway is callable only from inside an attested EigenCompute enclave
- **Type:** provider verification (inside-network)
- **Difficulty:** high
- **Credit:** your GitHub avatar on the EigenAI verdict + this task

> Read https://attest.fyi/llms.txt first.

## Mission
EigenAI is the gateway attest.fyi is built on, and the one it can't audit from the
outside. Its gateway accepts only a Bearer KMS-JWT minted via TEE attestation, and
the KMS keys are injected only inside an EigenCompute enclave (a laptop or CI gets a
flat 401). To verify it, attest.fyi has to join the network — run as an EigenCompute
app, mint the JWT, and audit the gateway from inside.

## What's known (architecture fully mapped)
- Gateway: `https://ai-gateway.eigencloud.xyz/v1` — OpenAI-compatible (`/v1/models`,
  `/v1/chat/completions`). Mainnet-alpha accepts audience `llm-proxy`.
- Auth: `@layr-labs/ai-gateway-provider` mints a per-call JWT via `AttestClient`
  against `KMS_SERVER_URL` + `KMS_PUBLIC_KEY`, auto-injected only inside
  EigenCompute. Confirmed live: `401 missing authorization` from outside.
- It is a confidential **proxy** to closed frontier models (Claude Sonnet 4.6,
  GPT-5, Gemini 2.5 Pro). The TEE attests the routing enclave; the model runs
  upstream at Anthropic / OpenAI / Google — there are no open weights to bind.
- The EigenCompute **instance** attestation IS externally verifiable (Intel TDX;
  the KMS mints externally-verified JWTs at boot — see `@layr-labs/ecloud-sdk/attest`,
  `AttestClient` / `JwtProvider`).
- CLI: `npm i -g @layr-labs/ecloud-cli@0.5.0` then `ecloud compute env set mainnet-alpha`.

## Done means
- A minimal prober deployed as an EigenCompute app that: mints the KMS-JWT, calls
  the gateway, and records (a) the gateway answers, (b) the EigenCompute instance
  attestation, verified to Intel's root, and (c) which upstream model replied.
- An honest verdict on `providers/eigenai.json`: the model is closed and runs
  upstream, so the bind is on the **routing enclave + instance attestation**, not
  on open weights — say exactly that.
- Evidence committed under `results/evidence/`; sign with `verify: eigenai`.

## Continue from here
Not started — the architecture is mapped (see the EigenAI row's findings); the
blocker is purely "you must be inside an attested enclave to call it." First step:
deploy a minimal prober via the ecloud CLI on mainnet-alpha, confirm the `llm-proxy`
audience mints a JWT the gateway accepts (the dev cluster 401'd with
`crypto/rsa: verification error`; mainnet-alpha works), and capture one instance
attestation. Reference to study: the `vanta` repo (`@layr-labs/ecloud-sdk`,
`@layr-labs/ai-gateway-provider`, `tee/src/attest.ts`).

## Submit
PR titled `task: eigenai — ...` with the prober and the captured instance
attestation under `results/evidence/`. Sign with `verify: eigenai`.
