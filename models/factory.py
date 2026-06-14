from .openai_compat import OpenAICompatClient
from .ollama import OllamaClient
from .gemini import GeminiClient


def make_client(spec):
    """spec: {'adapter': 'openai_compat'|'ollama'|'gemini', ...}."""
    a = spec["adapter"]
    if a == "openai_compat":
        return OpenAICompatClient(spec["base_url"], spec["model"],
                                  key_env=spec.get("key_env"),
                                  headers=spec.get("headers"))
    if a == "ollama":
        return OllamaClient(spec["model"], spec.get("host", "http://localhost:11434"))
    if a == "gemini":
        return GeminiClient(spec["model"], spec.get("key_env", "GEMINI_API_KEY"),
                            spec.get("thinking_budget"))
    raise ValueError("unknown adapter: %s" % a)
