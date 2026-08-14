// Everything that is not the board. Yukon puts this behind a "How it works"
// button rather than down the page as documentation; here it is one collapsed
// block at the bottom, so the page above it stays a hero and a board.

const TIERS = [
  ["1", "Different family", "separable"],
  ["2", "Different size, 1B vs 8B", "separable"],
  ["3", "Requantised, q4 vs fp16", "partly"],
  ["4", "One precision step, identical weights", "open"],
  ["5", "Endpoint answers audit-shaped traffic honestly", "open"],
];

export function Scoring() {
  return (
    <details id="how" className="how">
      <summary>How it works</summary>

      <div className="how-body">
        <div className="how-grid">
          <div>
            <span className="how-k">Metric</span>
            <span className="how-v">share of substitutions caught, 0&ndash;100</span>
          </div>
          <div>
            <span className="how-k">Gate</span>
            <span className="how-v">false accusations above 12.5% of negatives reject the run</span>
          </div>
          <div>
            <span className="how-k">Corpus</span>
            <span className="how-v">14 substitutions, 8 honest pairs, held out</span>
          </div>
          <div>
            <span className="how-k">Budget</span>
            <span className="how-v">24 probes per pair, two adaptive rounds</span>
          </div>
        </div>

        <div className="how-tiers">
          {TIERS.map(([n, what, status]) => (
            <div className="ch-tier" key={n}>
              <span className="ch-tier-n">{n}</span>
              <span className="ch-tier-w">{what}</span>
              <span className={`ch-tier-s ${status === "open" ? "open" : ""}`}>{status}</span>
            </div>
          ))}
        </div>

        <pre className="code">{`yukon clone <setter>/attest-challenge
cd attest-challenge && yukon setup && yukon run`}</pre>

        <p className="how-foot">
          You edit <span className="ch-code">detector/</span> only. No network, no labels, probe
          seed derived from your own submission.{" "}
          <a href="https://github.com/owizdom/attest-challenge" target="_blank" rel="noopener noreferrer">
            Full brief →
          </a>
        </p>
      </div>
    </details>
  );
}
