import type { Frontier as F } from "@/lib/types";

/**
 * The solver board, in teaser form.
 *
 * The register above ranks the audited. This ranks the people who build the
 * thing doing the auditing. The full board, the scoring rule and the corpus live
 * at /challenge, mirroring how Yukon gives every challenge its own page, so this
 * block stays short and sends you there.
 *
 * Server component: the "how it is scored" disclosure that used to need
 * useState moved to /challenge, so this ships no JS.
 */

const TOP_N = 3;

export function Frontier({ data }: { data: F | null }) {
  const entries = (data?.entries ?? []).slice(0, TOP_N);
  const rejected = data?.baseline_state === "rejected";

  return (
    <section id="frontier" className="register frontier">
      <div className="reg-top">
        <div className="board-tabs">
          <span className="board-tab on">The frontier</span>
        </div>
        <span className="label">
          {entries.length > 0
            ? `${data?.solvers ?? 0} ${data?.solvers === 1 ? "solver" : "solvers"} · ${
                data?.submissions ?? 0
              } promoted`
            : "open challenge · no submissions yet"}
        </span>
      </div>

      {entries.length > 0 ? (
        <>
          <div className="fr-head">
            <span className="fr-rank">№</span>
            <span>Solver</span>
            <span className="r">Score</span>
            <span className="col-delta r">Δ</span>
            <span className="r">State</span>
          </div>
          {entries.map((e) => (
            <div className="fr-row" key={`${e.solver}-${e.submission ?? e.rank}`}>
              <span className="fr-rank">{String(e.rank).padStart(2, "0")}</span>
              <div className="fr-who">
                <a href={`https://github.com/${e.solver}`} target="_blank" rel="noopener noreferrer">
                  {e.solver}
                </a>
                <small>{e.model}</small>
              </div>
              <div className="cell-r">
                <span className="score">{e.score.toFixed(2)}</span>
              </div>
              <div className="cell-r col-delta">
                {e.delta == null ? (
                  <span className="delta zero">—</span>
                ) : (
                  <span className={`delta ${e.delta > 0 ? "up" : "down"}`}>
                    {e.delta > 0 ? `+${e.delta.toFixed(2)}` : e.delta.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="cell-r">
                {e.live ? (
                  <span className="fr-live">
                    <span className="seal-mark">◉</span> live
                  </span>
                ) : (
                  <span className="fr-promoted">promoted</span>
                )}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="fr-empty">
          <p>
            The rule deciding the verdicts above scores{" "}
            <b>{rejected ? "zero" : (data?.baseline?.toFixed(2) ?? "zero")}</b> on its own
            benchmark. Beat it and it becomes yours.
          </p>
        </div>
      )}

      <p className="fr-foot">
        <a href="/challenge">See the challenge →</a>
      </p>
    </section>
  );
}
