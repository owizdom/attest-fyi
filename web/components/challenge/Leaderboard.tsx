import type { Frontier, FrontierEntry } from "@/lib/types";

// Yukon's leaderboard, column for column: № | Solver | Model | Score | Diff.
// The ◉ marks the promoted entry that is actually driving published verdicts,
// the same way Yukon marks its top score. Server component: unlike the register,
// this board has no interactive sort, so it ships no JS.

function Diff({ d }: { d?: number | null }) {
  if (d == null || d === 0) return <span className="delta zero">—</span>;
  return <span className={`delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2)}</span>;
}

function Row({ e }: { e: FrontierEntry }) {
  return (
    <div className="lb-row">
      <span className="lb-rank">{String(e.rank).padStart(2, "0")}</span>
      <a className="lb-solver" href={`https://github.com/${e.solver}`} target="_blank" rel="noopener noreferrer">
        {e.solver}
      </a>
      <span className="lb-model">{e.model}</span>
      <span className="lb-score">
        {e.score.toFixed(2)}
        {e.live ? <span className="seal-mark" title="this detector produces the published verdicts"> ◉</span> : null}
      </span>
      <span className="lb-diff"><Diff d={e.delta} /></span>
    </div>
  );
}

export function Leaderboard({ data }: { data: Frontier | null }) {
  const entries = data?.entries ?? [];

  return (
    <section id="leaderboard" className="lb">
      <div className="lb-head">
        <span className="lb-rank">№</span>
        <span>Solver</span>
        <span>Model</span>
        <span className="lb-score">Score</span>
        <span className="lb-diff">Diff</span>
      </div>

      {entries.length > 0 ? (
        entries.map((e) => <Row key={`${e.solver}-${e.submission ?? e.rank}`} e={e} />)
      ) : (
        <div className="lb-none">
          <p>
            No submissions yet. The board opens with the shipped rule already on it, and that rule
            scores <b>zero</b>.
          </p>
          {data?.baseline_note ? <p className="lb-baseline">{data.baseline_note}</p> : null}
          {data?.baseline_by_tier ? (
            <p className="lb-tiers">
              {Object.entries(data.baseline_by_tier).map(([tier, caught]) => (
                <span key={tier}>
                  <em>tier {tier}</em> {caught}
                </span>
              ))}
              {data.baseline_tpr != null ? (
                <span>
                  <em>detection rate</em> {data.baseline_tpr}%
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
