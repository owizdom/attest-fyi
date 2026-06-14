# submissions/

Publishable audit bundles, one per provider, written by `attest.py audit <id>`.

Each `<id>.json` holds the verdict, the provider manifest, and the scored row from
running the full metric (liveness + probes + seal verification + score) against
one provider. The raw attestation evidence lands separately in
`results/evidence/<id>.json`.

To publish a verdict to the board:

1. `python3 attest.py audit <id>` (with your manifest at `providers/<id>.json` and
   your key in `.env`).
2. Open a PR titled `verify: <id>` with the manifest, this bundle, and the
   evidence.
3. CI runs `attest.py verify`, which re-checks the seal from the evidence bytes.
   A passing seal cannot be faked. On merge you are credited on the board.

The seal is verified trustlessly by CI. The behavioural half is trustless only
when the provider signs its responses inside the TEE; otherwise it is "as
submitted" — reproducible against the public reference, but captured by you. Say
which in your PR. See `/llms.txt` for the full protocol.
