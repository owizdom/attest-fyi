"""OpenAI-compatible client. Covers Groq, RedPill, Together, Fireworks,
DeepInfra, OpenRouter and anything exposing /v1/chat/completions."""
import time
import urllib.error

from config import load_key
from ._http import post


def _err_msg(body):
    """Pull a human message out of the many error-body shapes providers use."""
    if not isinstance(body, dict):
        return ""
    e = body.get("error")
    if isinstance(e, dict):
        m = e.get("message") or e.get("type") or ""
    elif isinstance(e, str):
        m = e
    else:
        m = ""
    if not m:
        d = body.get("detail")
        m = d.get("message", "") if isinstance(d, dict) else (d if isinstance(d, str) else "")
    if not m:
        m = body.get("message", "")
    return str(m)[:70]


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
            if isinstance(r, dict) and "choices" not in r and ("error" in r or "detail" in r):
                return "<ERR %s>" % (_err_msg(r) or "api error")
            self.last_id = r.get("id")
            msg = r["choices"][0].get("message", {})
            content = msg.get("content")
            if content is None:  # reasoning models sometimes put text elsewhere
                content = msg.get("reasoning_content") or ""
            txt = content.strip()
            return txt if txt else "<EMPTY>"
        except urllib.error.HTTPError as e:
            msg = ""
            try:
                import json as _json
                msg = _err_msg(_json.loads(e.read().decode()))
            except Exception:
                pass
            if e.code in (429, 500, 502, 503) and _try < 5:
                time.sleep(2 ** _try)
                return self.generate(prompt, temperature, max_tokens, seed, _try + 1)
            return "<ERR %s>" % (msg or e.code)
        except Exception as e:
            if _try < 3:
                time.sleep(1.5)
                return self.generate(prompt, temperature, max_tokens, seed, _try + 1)
            return "<ERR %s>" % type(e).__name__
