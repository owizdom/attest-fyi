import type { Frontier, FrontierEntry } from "@/lib/types";

// Yukon's leaderboard block: a stat line, the headline best figure, a one-line
// note, then rows. Their /flock reads "236 promoted submissions, 40 solvers /
// best throughput 1,833,826 compressions/s / Highest verified compressions/s
// first". Rows carry rank+solver, the figure, the gain, and the model+date.
// The leader's row is accent-tinted.

function Gain({ d }: { d?: number | null }) {
  if (d == null || d === 0) return <span className="lb-gain flat">—</span>;
  return (
    <span className={`lb-gain ${d > 0 ? "up" : "down"}`}>
      {d > 0 ? "+" : ""}
      {d.toFixed(2)}
    </span>
  );
}

function Row({ e, lead }: { e: FrontierEntry; lead: boolean }) {
  return (
    <div className={`lb-row${lead ? " lead" : ""}`}>
      <span className="lb-who">
        <span className="lb-rank">{String(e.rank).padStart(2, "0")}</span>
        <a href={`https://github.com/${e.solver}`} target="_blank" rel="noopener noreferrer">
          {e.solver}
        </a>
      </span>
      <span className="lb-figure">
        {e.score.toFixed(2)}
        {e.live ? <em title="produces the published verdicts"> ◉ live</em> : null}
      </span>
      <span className="lb-cell"><Gain d={e.delta} /></span>
      <span className="lb-meta">{e.model}</span>
    </div>
  );
}

export function Leaderboard({ data }: { data: Frontier | null }) {
  const entries = data?.entries ?? [];
  const solvers = data?.solvers ?? 0;
  const subs = data?.submissions ?? 0;
  const best = entries[0]?.score ?? data?.baseline ?? 0;
  const none = entries.length === 0;

  return (
    <section id="leaderboard" className="lb">
      <div className="lb-top">
        <div>
          <h2>Leaderboard</h2>
          <p className="lb-count">
            {none
              ? "No one has solved it yet"
              : `${subs} accepted ${subs === 1 ? "entry" : "entries"} from ${solvers} ${
                  solvers === 1 ? "person" : "people"
                }`}
          </p>
        </div>
        <div className="lb-best">
          <span className="lb-best-k">best score</span>
          <span className="lb-best-v">{best.toFixed(2)}</span>
          <span className="lb-best-u">out of 100 · nobody yet</span>
        </div>
      </div>

      <p className="lb-note">
        Your score is the share of the 14 swaps you catch. Wrongly accusing more than one honest
        provider disqualifies the whole run.
      </p>

      <div className="lb-head">
        <span>№</span>
        <span>Solver</span>
        <span>Model</span>
        <span className="lb-figure">Score</span>
        <span className="lb-cell">Diff</span>
      </div>

      {entries.length > 0 ? (
        entries.map((e, i) => (
          <Row key={`${e.solver}-${e.submission ?? e.rank}`} e={e} lead={i === 0} />
        ))
      ) : (
        <div className="lb-row empty">
          <span className="lb-rank">—</span>
          <span className="lb-who"><span className="lb-base">the code running today</span></span>
          <span className="lb-meta">accused 4 of 8 honest providers</span>
          <span className="lb-figure">0.00</span>
          <span className="lb-cell"><span className="lb-gain flat">disqualified</span></span>
        </div>
      )}
    </section>
  );
}
