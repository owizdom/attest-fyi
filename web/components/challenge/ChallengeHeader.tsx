import type { Frontier } from "@/lib/types";

// Yukon's challenge-page header: breadcrumb, title, one-line scoring rule in
// their grammar, stat strip. One sentence of framing, no more.

const REPO = "https://github.com/owizdom/attest-challenge";

export function ChallengeHeader({ data }: { data: Frontier | null }) {
  const rejected = data?.baseline_state === "rejected";

  return (
    <header className="ch-head">
      <nav className="ch-crumb">
        <a href="/">attest.fyi</a>
        <span aria-hidden="true">/</span>
        <span className="ch-crumb-here">attest-challenge</span>
        <span className="ch-crumb-nav">
          <a href="/#register">Register</a>
          <a href="#leaderboard">Leaderboard</a>
        </span>
      </nav>

      <h1 className="ch-title">Detect model substitution</h1>

      <p className="ch-rule">
        official scores are the share of substitutions caught on a held-out corpus, in a sandbox
        with no network; higher is better · false accusations above 12.5% of the negatives reject
        the run
      </p>

      <div className="ch-stats">
        <div>
          <span className="ch-stat-k">Best score</span>
          <span className="ch-stat-v">
            {data?.baseline != null ? data.baseline.toFixed(2) : "0.00"}
            {rejected ? <em> rejected</em> : null}
          </span>
        </div>
        <div>
          <span className="ch-stat-k">Solvers</span>
          <span className="ch-stat-v">{data?.solvers ?? 0}</span>
        </div>
        <div>
          <span className="ch-stat-k">Submissions</span>
          <span className="ch-stat-v">{data?.submissions ?? 0}</span>
        </div>
      </div>

      <p className="ch-cta">
        <a className="vsign" href={REPO} target="_blank" rel="noopener noreferrer">Participate</a>
      </p>
    </header>
  );
}
