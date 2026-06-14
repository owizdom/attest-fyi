"""exp01 — can a trivial statistic tell two models apart, with a tight null?

Simulates the realistic fraud: a provider claims one model and serves a
cheaper sibling. We probe several Gemini models at temperature 0 and ask:
  - does the SAME model repeat itself? (the null)
  - do DIFFERENT models diverge?  (the signal)

Run:  python3 exp01_gemini_discrimination.py
Needs: GEMINI_API_KEY in env (or the local Model Card Explorer .env).
"""
import json, os, time
from lib import (load_gemini_key, gemini_generate, run_battery,
                 error_count, pair_report)
from probes import DIVERGENCE

# (label, model, thinking_budget). 2.5-pro must think; flash/lite run with
# thinking off for a clean greedy null.
RUNS = [
    ("flash1", "gemini-2.5-flash",      0),
    ("flash2", "gemini-2.5-flash",      0),   # null partner for flash1
    ("lite",   "gemini-2.5-flash-lite", 0),
    ("pro1",   "gemini-2.5-pro",        512),
    ("pro2",   "gemini-2.5-pro",        512),  # null partner for pro1
]

PAIRS = [
    ("null flash (same model 2x)",        "flash1", "flash2"),
    ("null pro (same model 2x)",          "pro1",   "pro2"),
    ("flash vs flash-lite (sibling swap)", "flash1", "lite"),
    ("flash vs pro (tier swap)",          "flash1", "pro1"),
    ("lite vs pro",                       "lite",   "pro1"),
]


def main():
    key = load_gemini_key()
    probes = DIVERGENCE
    print(f"exp01: {len(probes)} probes x {len(RUNS)} model-runs\n")
    t0 = time.time()
    results = {}
    for tag, model, tb in RUNS:
        gen = lambda p, m=model, b=tb: gemini_generate(m, p, thinking_budget=b, _key=key)
        outs = run_battery(gen, probes, workers=2)
        results[tag] = outs
        print(f"  {tag:6s} {model:22s} {time.time()-t0:6.1f}s  "
              f"errors={error_count(outs)}/{len(outs)}")

    total_err = sum(error_count(v) for v in results.values())
    table = pair_report(results, PAIRS)

    print("\n  comparison                            exact   sim")
    for label, _, _ in PAIRS:
        e, s = table[label]
        print(f"  {label:36s} {e:5.2f} {s:5.2f}")

    os.makedirs("results", exist_ok=True)
    json.dump({"probes": probes, "runs": RUNS, "results": results,
               "table": table, "total_errors": total_err},
              open("results/exp01_gemini.json", "w"), indent=2)
    print("\n  saved -> results/exp01_gemini.json")

    if total_err:
        print(f"\n  !! {total_err} errors — verdict withheld")
        return
    nf = table["null flash (same model 2x)"][0]
    sib = table["flash vs flash-lite (sibling swap)"][0]
    print(f"\n  null flash self-agreement : {nf:.2f}")
    print(f"  sibling swap match        : {sib:.2f}")
    print("  VERDICT:", "SIGNAL" if (nf >= 0.8 and sib <= nf - 0.25)
          else "WEAK")


if __name__ == "__main__":
    main()
