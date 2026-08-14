import type { Frontier } from "@/lib/types";

// Yukon's challenge hero: a dark rounded panel carrying the eyebrow, the
// headline number, one sentence, and a chart panel. Their /flock page reads
// "Current frontier / 255.10% / 255.1% more post-quantum TPS for Ethereum on
// Mac", then a chart, then the board. Same shape here.

const REPO = "https://github.com/owizdom/attest-challenge";

// The distribution overlap IS the chart for this challenge: the two ranges sit
// on one axis and visibly cross, which is the entire finding.
const AXIS = { min: 0.30, max: 0.58 };
const BANDS = [
  { k: "swaps", label: "substitutions", lo: 0.330, hi: 0.490, tone: "swap" },
  { k: "null", label: "same weights", lo: 0.420, hi: 0.551, tone: "null" },
];
const pct = (v: number) => ((v - AXIS.min) / (AXIS.max - AXIS.min)) * 100;

export function ChallengeHero({ data }: { data: Frontier | null }) {
  const rejected = data?.baseline_state === "rejected";
  const best = data?.baseline ?? 0;

  return (
    <section className="hero-card">
      <p className="hero-eyebrow">Current frontier</p>

      <div className="hero-figure">
        <span className="hero-num">{best.toFixed(2)}</span>
        {rejected ? <span className="hero-flag">rejected</span> : null}
      </div>

      <p className="hero-line">
        No detector has cleared the gate yet. The shipped rule catches{" "}
        {data?.baseline_tpr ?? 85.71}% of substitutions and falsely accuses 4 of 8 honest
        providers, so it scores nothing.
      </p>

      <div className="hero-actions">
        <a className="hero-btn" href={REPO} target="_blank" rel="noopener noreferrer">Participate</a>
        <a className="hero-btn ghost" href="#how">How it works</a>
      </div>

      <div className="hero-chart">
        <div className="hc-top">
          <span>Similarity to the claimed weights</span>
          <span className="hc-verdict">overlapping · no threshold separates them</span>
        </div>
        {BANDS.map((b) => (
          <div className="hc-row" key={b.k}>
            <span className="hc-label">{b.label}</span>
            <div className="hc-track">
              <div
                className={`hc-band ${b.tone}`}
                style={{ left: `${pct(b.lo)}%`, width: `${pct(b.hi) - pct(b.lo)}%` }}
              >
                <span className="hc-lo">{b.lo.toFixed(3)}</span>
                <span className="hc-hi">{b.hi.toFixed(3)}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="hc-axis">
          <span>{AXIS.min.toFixed(2)}</span>
          <span>{AXIS.max.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
