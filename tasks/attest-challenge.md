# Task: beat the substitution detector   (id: attest-challenge)

- **Status:** open — nothing blocks it, the baseline is measured and beatable
- **Type:** challenge — scored on Yukon, not a judgement call
- **Credit:** your detector becomes the one this register publishes verdicts
  with, cited by submission id in every cycle

> Read https://attest.fyi/llms.txt first for how behavioural binding works.

## Mission
Every verdict on the register rests on one function: given the transcripts from
an endpoint and from the weights it *claims* to be, decide whether they are the
same engine. Today that function is a mean similarity and a threshold of 0.45
(`scoring/verdict.py`).

On a labelled corpus of substitutions it catches 12 of 14, and falsely accuses 4
of 8 honest pairs, so the run is **rejected** and it scores **zero**. It is a
decent swap detector and not an auditor.

And no threshold fixes it. Measured across independent sampling sessions, honest
pairs land at 0.420-0.551 similarity and substitutions at 0.330-0.490. Those
overlap: the worst honest pair is *less* similar than the hardest swap, so every
threshold either misses that swap or accuses that provider. 0.45 is not a badly
chosen number, it is the best value of a measurement that cannot work.

Any valid run above zero beats the state of the art. Improve it.

## Why it is a benchmark and not a task
The rest of `tasks/` is work that needs a key, a GPU, or a parser nobody wrote
yet — judgement calls where "done" is an argument. This one has a number, a
labelled ground truth, and a fixed scoring rule, so it is posed as a benchmark
on Yukon instead of a brief. The corpus is models this project controls, so the
labels are known and nobody is accused of anything while you work.

## The corpus
| Tier | Substitution | Baseline |
|---|---|---|
| 1 | different family — llama vs qwen | caught |
| 2 | different size in one family — 1B vs 8B | caught |
| 3 | requantised, two steps, q4 vs fp16 | 3/3 held-out |
| 4 | one precision step, identical weights, fp16 vs q8 | 2/3 |
| 5 | endpoint recognises audit-shaped traffic and answers honestly for it | 1/2 |

It "catches" much of tiers 3-5 only by sitting at a threshold that also condemns
half the honest pairs. Detection without the false-positive gate is not a result.

Tiers 4 and 5 are open problems. `DESIGN.md` §10 calls tier 4 possibly
undetectable from behaviour alone and §6 calls tier 5 the hard ceiling. Nobody
knows whether either is solvable, which is the point of posing it publicly.

## Scoring
```
score = share of substitutions caught, 0-100
gate  = false accusations above the budget REJECT the run, score 0
```

The gate is rule two of `llms.txt` — *a false accusation ends the project* —
written as arithmetic. A detector that flags everything scores a perfect
detection rate and gets zero. Verified: it does.

## Done means
- A detector in `detector/` that produces a **valid** held-out run — one that
  stays inside the false-positive budget — with a detection rate above zero.
  The baseline does not manage this, so the first one that does is the result.
- A public submission note explaining what you measured and why it worked, so
  the next solver starts from your result rather than from the baseline.
- Anything that did *not* work written into `detector/memory/` — that directory
  is inside `editablePaths` on purpose, so notes travel with submissions.

## Where to start
`detector/memory/01-baseline.md` records the measured distributions and where
the rule fails. Two leads it names: the mean destroys the shape of the
disagreement (two sessions of one model differ *uniformly*; a requantised engine
agrees closely on most probes and diverges hard on a few — same mean, different
distribution), and the baseline's probes are *creative* ("a metaphor for
doubt"), which is close to the noisiest measurement available in a 1B model.
Prompts with a narrow correct answer should shrink the null and sharpen the
signal at once.

You also get a second round of probes that sees the first round's transcripts.
The baseline ignores it entirely.

## Continue from here
The benchmark is built and its own soundness is checked by `tools/verify.py`
(8/8 at time of writing, including a hostile-detector test against the sandbox).
Two known weaknesses, both infrastructure rather than research, and neither
requires beating the baseline:

1. **Corpus size.** Eight held-out negatives cannot establish the 0.1%
   false-positive rate a public accusation requires.
2. **Model size.** Tiers 3-5 use `llama3.2:1b` variants — the only family with
   fp16/q8/q4 builds that fit on a laptop — and 1B models are far noisier
   between sessions than what providers actually serve. The corpus is harder
   than production, so a rejection on it is not evidence a rule misbehaves
   against the live register. Quantisation variants of a larger model would fix
   this.
