"""Shared helpers for the attest.fyi early experiments.

No third-party deps. Two model clients (Gemini REST, local Ollama) and the
metrics used to compare model outputs: exact-match rate and mean string
similarity over a fixed probe battery at temperature 0.
"""
import json, os, re, time, difflib, statistics, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor


# ---------- keys ----------
def load_gemini_key():
    """Key from env first, then the local Model Card Explorer .env. Never printed."""
    k = os.environ.get("GEMINI_API_KEY")
    if k:
        return k
    fallback = os.path.expanduser("~/Desktop/ai-research-model-cards/.env")
    if os.path.exists(fallback):
        for line in open(fallback):
            m = re.match(r'\s*GEMINI_API_KEY\s*=\s*["\']?([^"\'\s]+)', line)
            if m:
                return m.group(1)
    raise RuntimeError("set GEMINI_API_KEY in the environment")


# ---------- clients ----------
def gemini_generate(model, prompt, temperature=0.0, max_tokens=2048,
                    thinking_budget=None, _key=None, _try=0):
    key = _key or load_gemini_key()
    gc = {"temperature": temperature, "maxOutputTokens": max_tokens}
    if thinking_budget is not None:
        gc["thinkingConfig"] = {"thinkingBudget": thinking_budget}
    body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": gc}
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           f"{model}:generateContent?key={key}")
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=90))
        c = r["candidates"][0]
        txt = "".join(p.get("text", "")
                      for p in c.get("content", {}).get("parts", [{}])).strip()
        return txt if txt else f"<EMPTY {c.get('finishReason')}>"
    except urllib.error.HTTPError as e:
        if e.code in (429, 500, 503) and _try < 6:
            time.sleep(2 ** _try)
            return gemini_generate(model, prompt, temperature, max_tokens,
                                   thinking_budget, key, _try + 1)
        return f"<ERR {e.code}>"
    except Exception as e:
        if _try < 3:
            time.sleep(2)
            return gemini_generate(model, prompt, temperature, max_tokens,
                                   thinking_budget, key, _try + 1)
        return f"<ERR {type(e).__name__}>"


def ollama_generate(model, prompt, temperature=0.0, seed=42,
                    num_predict=256, host="http://localhost:11434", _try=0):
    body = {"model": model, "prompt": prompt, "stream": False,
            "options": {"temperature": temperature, "seed": seed,
                        "num_predict": num_predict}}
    req = urllib.request.Request(host + "/api/generate",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=300))
        return r.get("response", "").strip() or "<EMPTY>"
    except Exception as e:
        if _try < 4:
            time.sleep(2)
            return ollama_generate(model, prompt, temperature, seed,
                                   num_predict, host, _try + 1)
        return f"<ERR {type(e).__name__}>"


def run_battery(generate_fn, probes, workers=2):
    """Run one model over the probe list, preserving order."""
    out = [None] * len(probes)

    def one(i):
        out[i] = generate_fn(probes[i])

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(one, range(len(probes))))
    return out


# ---------- metrics ----------
def norm(s):
    return re.sub(r"\s+", " ", s.strip().lower())


def error_count(outs):
    return sum(1 for x in outs if x.startswith(("<ERR", "<EMPTY")))


def exact_rate(a, b):
    return sum(norm(x) == norm(y) for x, y in zip(a, b)) / len(a)


def sim_rate(a, b):
    return statistics.mean(
        difflib.SequenceMatcher(None, norm(x), norm(y)).ratio()
        for x, y in zip(a, b))


def pair_report(results, pairs):
    """pairs: list of (label, keyA, keyB). Returns {label: (exact, sim)}."""
    table = {}
    for label, x, y in pairs:
        table[label] = (exact_rate(results[x], results[y]),
                        sim_rate(results[x], results[y]))
    return table
