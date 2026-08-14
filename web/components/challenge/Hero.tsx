import type { Frontier } from "@/lib/types";

// Yukon's hero card shape. Their headline number explains itself ("255.1% more
// post-quantum TPS"), ours does not: a bare 0.00 tells a first-time visitor
// nothing. So the plain-language problem leads, and the score is stated in a
// sentence that says why it is zero.

const REPO = "https://github.com/owizdom/attest-challenge";

// The chart is the finding: answers from the same model differ about as much as
// answers from two different models, so the bars overlap.
const AXIS = { min: 0.30, max: 0.58 };
const BANDS = [
  { k: "diff", label: "Different model", lo: 0.330, hi: 0.490, tone: "swap" },
  { k: "same", label: "Same model, twice", lo: 0.420, hi: 0.551, tone: "null" },
];
const pct = (v: number) => ((v - AXIS.min) / (AXIS.max - AXIS.min)) * 100;

export function ChallengeHero({ data }: { data: Frontier | null }) {
  const solved = (data?.entries?.length ?? 0) > 0;

  return (
    <section className="hero-card">
      <p className="hero-eyebrow">Open challenge</p>

      <h1 className="hero-h">Catch an AI provider serving you the wrong model.</h1>

      <p className="hero-line">
        A provider promises you one model and can quietly run a cheaper one instead. The security
        seal still passes, so nobody notices. Write code that spots the swap.
      </p>

      <div className="hero-actions">
        <a className="hero-btn" href={REPO} target="_blank" rel="noopener noreferrer">Start</a>
        <a className="hero-btn ghost" href="#how">How it works</a>
      </div>

      {!solved ? (
        <p className="hero-state">
          <b>Nobody has solved it yet.</b> The best attempt catches 12 of 14 swaps, but it also
          accuses 4 of 8 honest providers of cheating, so it does not count.
        </p>
      ) : null}

      <div className="hero-chart">
        <div className="hc-top">
          <span>Why it is hard</span>
          <span className="hc-verdict">the two overlap, so no simple cutoff works</span>
        </div>
        {BANDS.map((b) => (
          <div className="hc-row" key={b.k}>
            <span className="hc-label">{b.label}</span>
            <div className="hc-track">
              <div
                className={`hc-band ${b.tone}`}
                style={{ left: `${pct(b.lo)}%`, width: `${pct(b.hi) - pct(b.lo)}%` }}
              >
                <span className="hc-lo">{b.lo.toFixed(2)}</span>
                <span className="hc-hi">{b.hi.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
        <p className="hc-read">
          How alike two sets of answers are, 0 to 1. Ask the same model twice and it already
          disagrees with itself about as much as two different models do.
        </p>
      </div>
    </section>
  );
}
