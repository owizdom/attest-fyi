from .base import report


def verify(cfg, ctx):
    """No attestation claimed (fidelity-only providers, local honeypots)."""
    return report(present=False, vendor="none",
                  notes=["provider makes no attestation claim"])
