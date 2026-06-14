# Task: build the AMD SEV-SNP verifier   (id: sev-snp-verifier)

- **Status:** open — blocked on a live SEV-SNP report sample
- **Type:** verifier
- **Difficulty:** high
- **Credit:** your GitHub avatar on this task + every SEV-SNP provider it unblocks

> Read https://attest.fyi/llms.txt first. See `attestation/dcap.py` (Intel TDX)
> and `attestation/nvidia.py` (NVIDIA GPU) for the pattern to follow.

## Mission
attest.fyi parses Intel TDX and NVIDIA GPU attestations today. It does **not**
parse AMD SEV-SNP. Several providers market SEV-SNP (PrivateMode, Maple, some
Tinfoil backends), so verifying them needs a real SEV-SNP verifier. Build it.

## What's known
- An AMD SEV-SNP attestation report is a fixed binary structure (measurement,
  report_data, TCB, VCEK signature). The chain is **VCEK → ASK → ARK**, rooted at
  AMD's KDS (Key Distribution Service). The ARK is AMD's root; pin its
  fingerprint the way `dcap.py` pins Intel's SGX Root CA and `nvidia.py` pins
  NVIDIA's Device Identity CA.
- VCEK certs are fetched from AMD KDS by chip model + reported TCB (a public
  endpoint, no auth) — like how `dcap.py` fetches Intel PCS for TCB.
- Important honest note: when we tested the six funded providers, **none actually
  exposed a SEV-SNP quote** — the ones tagged SEV-SNP turned out to be Intel TDX +
  NVIDIA (Chutes) or a bare proxy with no attestation (PPQ). So this verifier has
  no in-repo sample yet. It must be built and tested against a real report from a
  provider that genuinely serves one (the PrivateMode task is the likely source).

## Done means
- `attestation/sev_snp.py` with a `verify(report)` that: parses the report,
  verifies the VCEK signed it, validates VCEK → ASK → ARK to the pinned AMD ARK,
  fetches/validates TCB from KDS, and returns the same report shape as the other
  verifiers (`present, signature_valid, root_trusted, measurements, ...`).
- Wired into `attestation/factory.py` (`type: "amd-sev-snp"`).
- **Tested against a real, live SEV-SNP report** (committed under
  `results/evidence/`), and `attest.py verify` reproduces it. A verifier with no
  live test does not count — that is the project's first rule.

## Continue from here
Not started. The blocker is a genuine SEV-SNP sample. Either pair this with the
`privatemode` task (capture a real report there first), or point it at any
provider you have that serves SEV-SNP and capture one report to develop against.
Use `cryptography` for the X.509/ECDSA work, exactly as `dcap.py` does.

## Submit
PR titled `task: sev-snp-verifier — ...` with the module, the factory wiring, and
a committed sample under `results/evidence/`.
