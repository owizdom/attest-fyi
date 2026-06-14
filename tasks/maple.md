# Task: verify Maple   (id: maple)

- **Status:** open — blocked: no public inference endpoint found
- **Type:** provider verification / research
- **Difficulty:** research
- **Credit:** your GitHub avatar on the Maple verdict + this task

> Read https://attest.fyi/llms.txt first.

## Mission
Maple (trymaple.ai) markets AMD SEV-SNP confidential AI, but we found no public,
programmatic inference endpoint to test. Either find a real API and verify it, or
establish (and document) that it is not externally verifiable today — which is
itself a legitimate, publishable result for this benchmark.

## What's known
- Vendor: trymaple.ai, AMD SEV-SNP.
- At survey time: "0 public" endpoints — the product appeared to be app/wallet
  gated, with no documented OpenAI-style API or attestation URL.

## Done means
EITHER:
- A real `providers/maple.json` + captured SEV-SNP report under
  `results/evidence/` + a reproducing `attest.py verify` (needs the
  `sev-snp-verifier`), if a programmatic endpoint exists;
OR:
- A documented `unknown` verdict with a precise finding: what access exists, what
  was tried, and why a third party currently cannot verify the seal. Add it to the
  board as `unknown` with that finding (honest "marketed but not externally
  checkable" is on-thesis).

## Continue from here
Not started. First step: confirm whether Maple exposes any API/SDK/attestation
outside its app. Check docs, any developer portal, network traffic from the app,
and community references. Record findings precisely either way.

## Submit
PR titled `task: maple — ...`. If documenting non-verifiability, put the finding
in `providers/maple.json` with `attestation.type: "none"` and a clear `findings`
entry. Sign with `verify: maple`.
