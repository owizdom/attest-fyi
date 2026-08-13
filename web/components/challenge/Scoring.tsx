// Below the board. Data carries the argument: the tier table and the measured
// distributions say what three paragraphs of prose used to say worse.

const REPO = "https://github.com/owizdom/attest-challenge";

const TIERS: { n: string; what: string; status: string }[] = [
  { n: "1", what: "Different family", status: "separable" },
  { n: "2", what: "Different size, 1B vs 8B", status: "separable" },
  { n: "3", what: "Requantised, q4 vs fp16", status: "partly" },
  { n: "4", what: "One precision step, identical weights", status: "open" },
  { n: "5", what: "Endpoint answers audit-shaped traffic honestly", status: "open" },
];

export function Scoring() {
  return (
    <>
      <section className="ch-sec">
        <h2>Corpus</h2>
        <div className="ch-tiers">
          {TIERS.map((t) => (
            <div className="ch-tier" key={t.n}>
              <span className="ch-tier-n">{t.n}</span>
              <span className="ch-tier-w">{t.what}</span>
              <span className={`ch-tier-s ${t.status === "open" ? "open" : ""}`}>{t.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ch-sec">
        <h2>Why the shipped rule scores zero</h2>
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
          The worst honest pair is less similar than the hardest swap. Every threshold either
          misses that swap or accuses that provider.
        </p>
      </section>

      <section className="ch-sec">
        <h2>Run it</h2>
        <pre className="code">{`yukon clone <setter>/attest-challenge
cd attest-challenge
yukon setup
yukon run`}</pre>
        <p className="ch-note">
          You edit <span className="ch-code">detector/</span>: a probe generator and a decision
          function. No network, no labels, seed derived from your own submission.{" "}
          <a href={REPO} target="_blank" rel="noopener noreferrer">Full brief →</a>
        </p>
      </section>
    </>
  );
}
