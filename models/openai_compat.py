"""OpenAI-compatible client. Covers Groq, RedPill, Together, Fireworks,
DeepInfra, OpenRouter and anything exposing /v1/chat/completions."""
import time
import urllib.error

from config import load_key
from ._http import post


class OpenAICompatClient:
    def __init__(self, base_url, model, key_env=None, api_key=None, headers=None):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key or load_key(key_env)
        self.headers = headers or {}
        self.last_id = None  # response id, so attestation can bind to the request

    def generate(self, prompt, temperature=0.0, max_tokens=256, seed=42, _try=0):
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = "Bearer " + self.api_key
        h.update(self.headers)
        body = {"model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature, "max_tokens": max_tokens, "seed": seed}
        try:
            r = post(self.base_url + "/chat/completions", body, h)
            if isinstance(r, dict) and "error" in r and "choices" not in r:
                msg = str((r.get("error") or {}).get("message", "") or "api error")[:60]
                return "<ERR %s>" % msg
            self.last_id = r.get("id")
            txt = r["choices"][0]["message"]["content"].strip()
            return txt if txt else "<EMPTY>"
        except urllib.error.HTTPError as e:
            try:
                import json as _json
                body_err = _json.loads(e.read().decode())
                msg = str((body_err.get("error") or {}).get("message", ""))[:60]
                if msg and e.code not in (429, 500, 502, 503):
                    return "<ERR %s>" % msg
            except Exception:
                pass
            if e.code in (429, 500, 502, 503) and _try < 5:
                time.sleep(2 ** _try)
                return self.generate(prompt, temperature, max_tokens, seed, _try + 1)
            return "<ERR %d>" % e.code
        except Exception as e:
            if _try < 3:
                time.sleep(1.5)
                return self.generate(prompt, temperature, max_tokens, seed, _try + 1)
            return "<ERR %s>" % type(e).__name__
