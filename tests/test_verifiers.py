"""Known-answer tests for the crypto verifiers — the part that must never break
silently. Vectors are the committed evidence in results/evidence/ (a signature is
a permanent valid vector; a quote's chain-to-root is deterministic and offline).
Run: python3 -m unittest tests.test_verifiers
"""
import json
import os
import unittest

from attestation import dcap, nvidia, eth_sig, reverify, signing

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVID = os.path.join(ROOT, "results", "evidence")


def _ev(name):
    with open(os.path.join(EVID, name + ".json")) as f:
        return json.load(f)


class Keccak(unittest.TestCase):
    def test_empty_vector(self):
        self.assertEqual(
            eth_sig.keccak256(b"").hex(),
            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")

    def test_known_string(self):
        # keccak256("abc")
        self.assertEqual(
            eth_sig.keccak256(b"abc").hex(),
            "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45")


class EthRecover(unittest.TestCase):
    def test_recover_redpill_signatures(self):
        samples = _ev("redpill")["signed"]["samples"]
        self.assertTrue(samples, "no committed signed samples")
        for s in samples:
            rec = eth_sig.recover_eth_personal(s["text"], s["signature"])
            self.assertIsNotNone(rec, "recovery failed")
            self.assertEqual(rec.lower(), s["signing_address"].lower())

    def test_tampered_signature_does_not_recover_address(self):
        s = _ev("redpill")["signed"]["samples"][0]
        rec = eth_sig.recover_eth_personal(s["text"] + "X", s["signature"])
        self.assertNotEqual((rec or "").lower(), s["signing_address"].lower())


class DcapTDX(unittest.TestCase):
    def test_dstack_quotes_root_to_intel(self):
        for name in ("redpill", "near-ai", "venice"):
            r = reverify.reverify_evidence(_ev(name))
            self.assertIsNotNone(r, name)
            self.assertTrue(r["signature_valid"], "%s sig" % name)
            self.assertTrue(r["root_trusted"], "%s root" % name)

    def test_chutes_fleet_roots(self):
        r = reverify.reverify_evidence(_ev("nanogpt"))
        self.assertTrue(r and r["root_trusted"], "nanogpt fleet root")


class NvidiaGPU(unittest.TestCase):
    def test_payloads_chain_to_nvidia_root(self):
        for name in ("redpill", "venice"):
            np = _ev(name).get("nvidia_payload")
            if not np:
                continue
            g = nvidia.verify(np)
            self.assertTrue(g["present"], "%s gpu present" % name)
            self.assertTrue(g["root_trusted"], "%s gpu root" % name)


class GoldPathOffline(unittest.TestCase):
    def test_redpill_signed_responses_reverify(self):
        ok, tot = signing.reverify_signed(_ev("redpill")["signed"])
        self.assertGreater(tot, 0)
        self.assertEqual(ok, tot, "signed responses must all re-verify offline")


if __name__ == "__main__":
    unittest.main()
