"""Gemini REST client. seed is ignored (unsupported); thinking_budget controls
whether a 2.5 model reasons, which loosens its null (see early-experiments)."""
import time
import urllib.error

from config import load_key
from ._http import post


class GeminiClient:
    def __init__(self, model, key_env="GEMINI_API_KEY", thinking_budget=None):
        self.model = model
        self.api_key = load_key(key_env)
        self.thinking_budget = thinking_budget
        self.last_id = None

    def generate(self, prompt, temperature=0.0, max_tokens=2048, seed=42, _try=0):
        gc = {"temperature": temperature, "maxOutputTokens": max_tokens}
        if self.thinking_budget is not None:
            gc["thinkingConfig"] = {"thinkingBudget": self.thinking_budget}
        body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": gc}
        url = ("https://generativelanguage.googleapis.com/v1beta/models/"
               "%s:generateContent?key=%s" % (self.model, self.api_key))
        try:
            r = post(url, body, {"Content-Type": "application/json"})
            c = r["candidates"][0]
            txt = "".join(p.get("text", "")
                          for p in c.get("content", {}).get("parts", [{}])).strip()
            return txt if txt else "<EMPTY %s>" % c.get("finishReason")
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and _try < 5:
                time.sleep(2 ** _try)
                return self.generate(prompt, temperature, max_tokens, seed, _try + 1)
            return "<ERR %d>" % e.code
        except Exception as e:
            if _try < 3:
                time.sleep(2)
                return self.generate(prompt, temperature, max_tokens, seed, _try + 1)
            return "<ERR %s>" % type(e).__name__
