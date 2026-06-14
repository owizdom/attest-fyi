"""Model binding — does the attestation actually commit to the model weights?

Two tiers, strongest first:

  measurement_binding  the strongest form: the attestation's measurements (an
                       RTMR event log entry / report_data) commit to a hash of
                       the loaded weights, and that hash matches the expected
                       value for the claimed model. A provider that bakes the
                       model into a measured image earns this. Gateways that
                       load weights at runtime do not, and we report that
                       honestly rather than pretend.

  behavioural_binding  (in scoring) the served model is verified by behaviour to
                       be the claimed model — it matches a TRUSTED reference we
                       built from the canonical open weights on our own hardware,
                       and is clearly distinguishable from a decoy model.
"""
import json

_MODEL_EVENT_HINTS = ("model", "weight", "safetensor", "gguf", "checkpoint", "ckpt", "lora")


def measurement_binding(att, expected=None):
    """Return (bound, detail). bound=True only if the attestation measures the
    weights (optionally matching `expected`)."""
    el = att.get("event_log")
    if isinstance(el, str):
        try:
            el = json.loads(el)
        except Exception:
            el = []
    events = el if isinstance(el, list) else []
    model_events = [e for e in events
                    if any(h in str(e.get("event", "")).lower() for h in _MODEL_EVENT_HINTS)]
    if not model_events:
        return False, "no model/weight measurement in the attestation event log"
    if expected:
        for e in model_events:
            if str(e.get("digest", "")).lower() == expected.lower():
                return True, "weight digest in event log matches expected (%s…)" % expected[:16]
        return False, "model measurement present but does not match the expected weight digest"
    return True, "model measurement present in the attestation event log"
