// Everything below the board: the corpus, why the baseline fails, and how to run
// it. This is the part that makes it a challenge page rather than a leaderboard.

const REPO = "https://github.com/owizdom/attest-challenge";

const TIERS: { tier: string; what: string; status: string }[] = [
  { tier: "1", what: "Different family, llama served where qwen was claimed", status: "separable today" },
  { tier: "2", what: "Different size in one family, 1B vs 8B", status: "separable today" },
  { tier: "3", what: "Requantisation two steps apart, q4 vs fp16", status: "partly" },
  { tier: "4", what: "One precision step, identical weights, fp16 vs q8", status: "open" },
  { tier: "5", what: "The endpoint serves the real model to traffic it recognises as an audit, and the cheap one to everything else", status: "open" },
];

export function Scoring() {
  return (
    <>
      <section className="ch-sec">
        <h2>The corpus</h2>
        <div className="ch-tiers">
          {TIERS.map((t) => (
            <div className="ch-tier" key={t.tier}>
              <span className="ch-tier-n">{t.tier}</span>
              <span className="ch-tier-w">{t.what}</span>
              <span className={`ch-tier-s ${t.status === "open" ? "open" : ""}`}>{t.status}</span>
            </div>
          ))}
        </div>
        <p className="ch-note">
          Tiers 4 and 5 are not exercises with hidden answers. attest.fyi&apos;s own design notes
          call tier 4 <b>possibly undetectable from behaviour alone</b> and tier 5 <b>the hard
          ceiling</b>. Nobody knows whether either is solvable.
        </p>
      </section>

      <section className="ch-sec">
        <h2>Why the shipped rule scores zero</h2>
        <p className="ch-note">
          Negatives are the same weights sampled twice, not the same call twice: the endpoint and
          the reference run as different sessions at temperature 0.7, because at temperature 0 the
          problem collapses into a byte comparison that measures nothing.
        </p>
        <pre className="code">{`                              n     mean      min      max
negatives (same weights)      6    0.472    0.420    0.551
tier 1 swaps                  3    0.357    0.330    0.390
tier 2 swaps                  3    0.390    0.358    0.407
tier 3 swaps                  2    0.432    0.423    0.441
tier 4 swaps                  2    0.455    0.420    0.490
tier 5 swaps                  1    0.431    0.431    0.431

null floor (worst honest pair):   0.420
swap ceiling (easiest to miss):   0.490
separable by a single threshold:  NO (gap -0.070)`}</pre>
        <p className="ch-note">
          The worst honest pair is <b>less</b> similar than the hardest swap, so every threshold
          either misses that swap or accuses that provider. 0.45 is not a badly chosen constant, it
          is the best available value of a measurement that cannot work. The opening move is not to
          tune it, it is to measure something else.
        </p>
      </section>

      <section className="ch-sec">
        <h2>Run it</h2>
        <pre className="code">{`yukon clone <setter>/attest-challenge
cd attest-challenge
yukon setup     # pulls the pinned Ollama tags, the models ARE the corpus
yukon run       # scores you on the held-out split`}</pre>
        <p className="ch-note">
          You edit <span className="ch-code">detector/</span> and nothing else: a probe generator
          and a decision function. Your code is a pure function on both ends, so the sandbox denies
          the network outright and the harness owns every endpoint call. The probe seed is a
          SHA-256 of your own submission, so you cannot know which probes will run until your code
          is fixed.
        </p>
        <p className="ch-note">
          The held-out corpus is not in the repository. That is what makes it held out. Locally you
          get the dev split; the real score comes back from the scoring runner.{" "}
          <a href={REPO} target="_blank" rel="noopener noreferrer">Full brief and reference numbers →</a>
        </p>
      </section>
    </>
  );
}
