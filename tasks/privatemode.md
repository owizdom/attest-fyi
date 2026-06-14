# Task: verify PrivateMode   (id: privatemode)

- **Status:** open — blocked on an account/key and the SEV-SNP verifier
- **Type:** provider verification
- **Difficulty:** high
- **Credit:** your GitHub avatar on the PrivateMode verdict + this task

> Read https://attest.fyi/llms.txt first.

## Mission
Get PrivateMode (Edgeless Systems) onto the board. It markets AMD SEV-SNP + Intel
TDX inside a Cosmian/Edgeless confidential VM. Determine whether its seal is real
and checkable, and whether the served model matches the claim.

## What's known
- Base URL (best-effort): `https://api.privatemode.ai/v1`.
- It is not a plain OpenAI-compatible passthrough — PrivateMode typically routes
  through a local proxy / SDK that performs attestation before forwarding the
  prompt. So the attestation surface may be the proxy or the SDK, not an HTTP
  endpoint. Expect to read their docs/SDK to find where the SEV-SNP report comes
  out.
- Because the seal is (claimed) AMD SEV-SNP, verifying it depends on the
  `sev-snp-verifier` task. If you capture a real report here, that doubles as the
  sample that unblocks the verifier.

## Done means
- `providers/privatemode.json` with the right `served`/`attestation` wiring (a new
  attestation `type` if the proxy/SDK shape needs one).
- A real SEV-SNP report captured under `results/evidence/privatemode.json`, and
  `attest.py verify` reproduces the seal verdict via `attestation/sev_snp.py`.
- Honest `findings`: is the seal client-verifiable, or proxy-mediated only? Does
  the model bind, or is it too large to reference?

## Continue from here
Not started. First step: create a PrivateMode account, get access, and trace
exactly how a prompt is attested (proxy vs SDK vs endpoint) and where the
SEV-SNP report is exposed. Capture one real report — that is the unlock for both
this task and `sev-snp-verifier`. If access is gated/enterprise-only, record that
as the blocker with the exact step that failed.

## Submit
PR titled `task: privatemode — ...`, evidence under `results/evidence/`. Sign with
`verify: privatemode`.
