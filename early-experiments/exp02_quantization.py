"""exp02 — the hard case: same weights, different precision.

exp01 showed different models are easy to tell apart. The real question for
attest.fyi is whether QUANTIZATION of the SAME model is detectable, because
"serve the model you attested, but at int4 to save memory" is the subtle
fraud. We run one base model locally (Ollama) at several quant levels at
temperature 0 with a fixed seed and ask the same two questions:
  - does one quant repeat itself?       (the null)
  - does a different quant diverge?      (the signal we hope to see)

Run:  python3 exp02_quantization.py <tagA> <tagB> [tagC]
e.g.  python3 exp02_quantization.py llama3.2:1b-instruct-q4_K_M \
                                    llama3.2:1b-instruct-q8_0  \
                                    llama3.2:1b-instruct-fp16
Needs: a local ollama server with the tags already pulled.
"""
import json, os, sys, time
from lib import ollama_generate, run_battery, error_count, exact_rate, sim_rate
from probes import DIVERGENCE


def main():
    tags = sys.argv[1:]
    if len(tags) < 2:
        print("usage: exp02_quantization.py <tagA> <tagB> [tagC ...]")
        sys.exit(1)
    probes = DIVERGENCE
    base = tags[0]
    print(f"exp02: {len(probes)} probes, base={base}, quants={tags}\n")

    t0 = time.time()
    results = {}
    # null: run the base quant twice
    runs = [("A1", tags[0]), ("A2", tags[0])] + \
           [(f"q{i}", t) for i, t in enumerate(tags[1:], start=1)]
    for tag, model in runs:
        gen = lambda p, m=model: ollama_generate(m, p, temperature=0.0,
                                                  seed=42, num_predict=256)
        outs = run_battery(gen, probes, workers=1)  # local: keep it serial
        results[tag] = {"model": model, "outs": outs}
        print(f"  {tag:4s} {model:34s} {time.time()-t0:6.1f}s  "
              f"errors={error_count(outs)}/{len(outs)}")

    pairs = [("null (base vs base)", "A1", "A2")]
    for i, t in enumerate(tags[1:], start=1):
        pairs.append((f"base vs {t.split(':')[-1]}", "A1", f"q{i}"))
    # adjacent-precision pairs (e.g. q8 vs fp16) probe whether MILD
    # quantization is detectable, or only heavy downgrades.
    for i in range(1, len(tags) - 1):
        a, b = tags[i].split(":")[-1], tags[i + 1].split(":")[-1]
        pairs.append((f"{a} vs {b} (mild)", f"q{i}", f"q{i+1}"))

    table = {}
    print("\n  comparison                         exact   sim")
    for label, x, y in pairs:
        e = exact_rate(results[x]["outs"], results[y]["outs"])
        s = sim_rate(results[x]["outs"], results[y]["outs"])
        table[label] = (e, s)
        print(f"  {label:34s} {e:5.2f} {s:5.2f}")

    os.makedirs("results", exist_ok=True)
    json.dump({"probes": probes, "results": results, "table": table},
              open("results/exp02_quant.json", "w"), indent=2)
    print("\n  saved -> results/exp02_quant.json")

    total_err = sum(error_count(v["outs"]) for v in results.values())
    if total_err:
        print(f"\n  !! {total_err} errors — verdict withheld")
        return
    null_e = table["null (base vs base)"][0]
    cross = [table[k][0] for k in table if k != "null (base vs base)"]
    worst = min(cross) if cross else 1.0
    print(f"\n  null self-agreement        : {null_e:.2f}")
    print(f"  most divergent quant match : {worst:.2f}")
    if null_e >= 0.9 and worst <= null_e - 0.2:
        print("  VERDICT: quantization is DETECTABLE behaviourally")
    elif null_e >= 0.9:
        print("  VERDICT: quantization NOT clearly detectable by exact-match "
              "(the predicted blind spot)")
    else:
        print("  VERDICT: loose null — local decoding not deterministic enough")


if __name__ == "__main__":
    main()
