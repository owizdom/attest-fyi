import type { Frontier } from "@/lib/types";

// yukon.org/mlxfast, rebuilt. Their hero is: mark + a sentence with the headline
// number set in an inverted plate + an info dot, action pills top-right, then a
// framed chart panel with control chips, right-hand axis labels, a dotted
// baseline and a "now" endpoint.
//
// Theirs reads "Laguna XS 2.1 now runs [162.0%] faster on Mac."
// Ours reads   "Swapped models get caught [0.0%] of the time."

const REPO = "https://github.com/owizdom/attest-challenge";

// No submissions yet, so the record line sits flat on the baseline. It becomes a
// real series the moment one lands.
const PLOT = { w: 1000, h: 262, pad: { t: 14, r: 62, b: 26, l: 4 } };
const GRID = [100, 50];

export function ChallengeHero({ data }: { data: Frontier | null }) {
  const best = data?.entries?.[0]?.score ?? data?.baseline ?? 0;
  const { w, h, pad } = PLOT;
  const y0 = h - pad.b;
  const yFor = (v: number) => pad.t + (1 - v / 100) * (y0 - pad.t);
  const xEnd = w - pad.r;
  const yNow = yFor(best);

  return (
    <section className="hero-card">
      <div className="hero-top">
        <div className="hero-said">
          <svg className="hero-mark" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <circle cx="32" cy="32" r="7" fill="currentColor" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line
                key={a}
                x1="32" y1="32"
                x2={32 + 27 * Math.cos((a * Math.PI) / 180)}
                y2={32 + 27 * Math.sin((a * Math.PI) / 180)}
                stroke="currentColor" strokeWidth="1.6" opacity="0.55"
              />
            ))}
          </svg>

          <h1 className="hero-h">
            Swapped models get caught{" "}
            <span className="hero-plate">{best.toFixed(1)}%</span> of the time.
            <span
              className="hero-i"
              title="An AI provider promises you one model and can quietly run a cheaper one. The security seal still passes. This is the share of swaps the best submitted detector catches without falsely accusing honest providers."
            >
              i
            </span>
          </h1>
        </div>

        <div className="hero-btns">
          <a className="hero-btn" href="#how">How it works</a>
          <a className="hero-btn solid" href={REPO} target="_blank" rel="noopener noreferrer">
            Participate
          </a>
        </div>
      </div>

      <div className="hero-chart">
        <div className="hc-bar">
          <div className="hc-seg">
            <span className="hc-chip on">Record</span>
            <span className="hc-chip">By model</span>
          </div>
          <div className="hc-seg">
            <span className="hc-chip on">Lin</span>
            <span className="hc-chip">Log</span>
            <span className="hc-chip">All</span>
          </div>
        </div>

        <div className="hc-plot">
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
               aria-label={`Best score over time, currently ${best.toFixed(1)} percent`}>
            {GRID.map((g) => (
              <g key={g}>
                <line className="hc-grid" x1={pad.l} y1={yFor(g)} x2={xEnd} y2={yFor(g)} />
                <text className="hc-ylab" x={xEnd + 10} y={yFor(g) + 4}>{g}.0%</text>
              </g>
            ))}
            <line className="hc-base" x1={pad.l} y1={y0} x2={xEnd} y2={y0} />
            <text className="hc-tag" x={pad.l} y={y0 + 17}>baseline</text>
            <text className="hc-ylab" x={xEnd + 10} y={y0 + 4}>0.0%</text>

            <line className="hc-line" x1={pad.l} y1={yNow} x2={xEnd} y2={yNow} />
            <circle className="hc-dot" cx={xEnd} cy={yNow} r="4.5" />
            <text className="hc-tag" x={xEnd + 10} y={yNow - 10}>now</text>
          </svg>
        </div>

        <p className="hc-foot">
          no submissions yet · the line moves the first time someone beats the code running today
        </p>
      </div>
    </section>
  );
}
