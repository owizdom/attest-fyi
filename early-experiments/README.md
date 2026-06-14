# early experiments

Quick, real tests of the one assumption attest.fail lives or dies on: that a
cheap behavioural statistic can tell whether the model answering you is the
model claimed, with a null tight enough to threshold on.

These were run on real models in one sitting to decide whether the project is
worth building. Short answer: yes, with one honest limit that the data makes
precise.

## What gets measured

Every probe runs at temperature 0. For a pair of model runs we report two
numbers over the probe battery in `probes.py`:

- **exact** — fraction of probes where the two outputs are byte-identical after
  whitespace/case normalisation.
- **sim** — mean character-level similarity (Python `difflib` ratio), a softer
  graded version.

The logic is the same both times. If the **same** model repeats itself the
score is high (the null). If a **different** model or precision answers, the
score drops. The gap between them is the detectable signal.

## How to run

```bash
# exp01 needs a Gemini key (env GEMINI_API_KEY, or the local Model Card .env)
python3 exp01_gemini_discrimination.py

# exp02 needs a local ollama server with the quant tags pulled
ollama serve &
ollama pull llama3.2:1b-instruct-q4_K_M
ollama pull llama3.2:1b-instruct-q8_0
ollama pull llama3.2:1b-instruct-fp16
python3 exp02_quantization.py \
  llama3.2:1b-instruct-q4_K_M llama3.2:1b-instruct-q8_0 llama3.2:1b-instruct-fp16
```

Raw outputs land in `results/`.

---

## exp01 — telling different models apart

**Question.** Can exact-match at temperature 0 separate a model from a cheaper
sibling, the way a fraud would swap them?

**Setup.** Five Gemini runs over 12 probes: `2.5-flash` twice (the null),
`2.5-flash-lite` once (the cheap sibling), `2.5-pro` twice (a premium tier and
its own null). flash/lite run with thinking off; pro must think.

**Result.**

| comparison | exact | sim |
|---|---|---|
| null: flash vs itself | **1.00** | 1.00 |
| null: pro vs itself | 0.50 | 0.84 |
| flash vs flash-lite (sibling swap) | **0.25** | 0.58 |
| flash vs pro (tier swap) | 0.08 | 0.48 |
| lite vs pro | 0.08 | 0.49 |

**Findings.**

1. A non-thinking model at temperature 0 is byte-for-byte reproducible across
   independent sessions (flash null 1.00). That tight null is the whole
   foundation: any deviation is real signal.
2. The realistic cheap-swap (flash served as flash-lite) is caught with a wide
   margin, 1.00 down to 0.25, using 12 throwaway probes and no statistics.
3. Thinking models have a **loose null**. `2.5-pro` agrees with itself only
   ~0.50 of the time at temperature 0, because its internal reasoning varies.
   So exact-match is the wrong tool for thinking models. They need multi-sample
   distributional fingerprints and a per-model threshold. This scopes the
   method rather than breaking it.

Tangible example (invent a one-word startup name): flash said `Veritas` both
runs, pro said `Veritascope` both runs. Stable within a model, different across
models.

### A methods note: the first run was wrong

The first attempt reported a "perfect" 1.00 null and 0.00 everywhere else, which
looked too clean. It was. `gemini-2.5-pro` was returning HTTP 400 on every probe
(it rejects `thinkingBudget: 0`) and `gemini-2.0-flash` was retired (404). The
"null" was comparing identical error strings, and a stray 0.89 similarity was
`<ERR 400>` against `<ERR 404>`. Reading the raw transcripts caught it. That is
the project's own rule applied to itself: do not trust the score, read the
transcript. The clients now mark errors and the scripts withhold a verdict if
any appear.

---

## exp02 — the hard case: same model, different precision

**Question.** exp01 proved different models are easy. The subtle fraud is
serving the attested model at a lower precision (int4 instead of fp16) to save
memory. Is quantization detectable behaviourally?

**Setup.** One model, `llama3.2:1b-instruct`, pulled at three precisions and run
locally through Ollama at temperature 0 with a fixed seed. q4_K_M twice (the
null), then q8_0 and fp16.

**Result.**

| comparison | exact | sim |
|---|---|---|
| null: q4 vs itself | **1.00** | 1.00 |
| q4 vs q8 | **0.33** | 0.69 |
| q4 vs fp16 | **0.33** | 0.69 |
| q8 vs fp16 (mild) | **0.92** | 0.98 |

**Findings.**

1. Local greedy decoding with a fixed seed is perfectly deterministic (null
   1.00), so this is a clean test.
2. **Heavy quantization is detectable.** Dropping to int4 moves agreement from
   1.00 to 0.33. Serving int4 while attesting a higher precision leaves a clear
   behavioural fingerprint, at least on this model.
3. **Mild quantization is nearly invisible.** int8 versus fp16 sits at 0.92,
   essentially at the null. This confirms, with data, the blind spot the design
   already named: fp16-vs-int8 of identical weights cannot be reliably separated
   by behaviour. The method has a real minimum detectable difference, and now we
   have measured roughly where it is for this model.

Tangible example (eight-word continuation of "before the storm"): q4 wrote
"of darkness crept over the small town", fp16 wrote "the wind whispered secrets
to the trees". Same weights, different precision, clearly different output.

---

## Overall verdict

**Worth pursuing.** The common, lazy fraud (swap in a cheaper or heavily
quantised model and pocket the difference) is detectable with a wide margin
using almost nothing. The null is tight for ordinary greedy decoding, which is
what makes any deviation meaningful.

The limits are real and now quantified rather than guessed:

- **Thinking models loosen the null.** They need multi-sample distributional
  scoring, not exact-match.
- **Mild quantization (int8 vs fp16) is a genuine blind spot.** The method
  catches downgrades, not hairline precision changes.

Caveats on these numbers: 12 probes is small and directional, not precise. The
quantization test used a 1B model, and small models are more sensitive to
quantization than large ones, so heavy-quant detectability may weaken on the
large models that matter commercially, while the int8 blind spot likely
persists. Remote providers with batching and sampling will have a looser null
than the local greedy setup here.

## Next

1. Build the multi-sample distributional scorer so thinking models get a fair
   null (logprob divergence, not exact-match).
2. Repeat the quantization ladder on a larger model to see how detectability
   scales with size.
3. Wire the attestation verifier (the cryptographic half) alongside, since the
   strongest verdict is "valid seal that does not bind the model" plus
   "behaviour diverges". See `../DESIGN.md`.
