"""Local Ollama client. Used for ground-truth references and for the local
honeypot providers (honest vs swapped) that validate the pipeline offline."""
import time

from ._http import post


class OllamaClient:
    def __init__(self, model, host="http://localhost:11434"):
        self.model = model
        self.host = host.rstrip("/")
        self.last_id = None

    def generate(self, prompt, temperature=0.0, max_tokens=256, seed=42, _try=0):
        body = {"model": self.model, "prompt": prompt, "stream": False,
                "options": {"temperature": temperature, "seed": seed,
                            "num_predict": max_tokens}}
        try:
            r = post(self.host + "/api/generate", body,
                     {"Content-Type": "application/json"}, timeout=300)
            return r.get("response", "").strip() or "<EMPTY>"
        except Exception as e:
            if _try < 4:
                time.sleep(2)
                return self.generate(prompt, temperature, max_tokens, seed, _try + 1)
            return "<ERR %s>" % type(e).__name__
