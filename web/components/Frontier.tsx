"use client";
import { useState } from "react";
import type { Frontier as F, FrontierEntry } from "@/lib/types";

const CHALLENGE = "https://yukon.org";

/**
 * The solver board.
 *
 * The register above ranks the audited. This ranks the people who build the
 * thing doing the auditing, and the two are deliberately the same visual
 * grammar — a score, a delta, a verification mark — because on this site
 * "verified" should mean one thing whichever board you are reading.
 */

function Delta({ d }: { d?: number | null }) {
  if (d == null) return <span className="delta zero">—</span>;
  if (d === 0) return <span className="delta zero">0</span>;
  return <span className={`delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? `▲ +${d}` : `▼ ${d}`}</span>;
}

function Row({ e, baseline }: { e: FrontierEntry; baseline?: number }) {
  const over = baseline != null ? e.score - baseline : null;
  return (
    <div className="fr-row">
      <span className="fr-rank">{e.rank}</span>
      <div className="fr-who">
        <a href={`https://github.com/${e.solver}`} target="_blank" rel="noopener noreferrer">
          {e.solver}
        </a>
        <small>{e.model}</small>
      </div>
      <div className="cell-r">
        <span className="score">
          {e.score.toFixed(1)}
          <span className="sub">
            {over != null && over > 0 ? `+${over.toFixed(1)} over baseline` : "detection rate"}
          </span>
        </span>
      </div>
      <div className="cell-r col-delta"><Delta d={e.delta} /></div>
      <div className="cell-r">
        {e.live ? (
          <span className="fr-live" title="This detector produces the verdicts published in the register above.">
            <span className="seal-mark">◉</span> live
          </span>
        ) : (
          <span className="fr-promoted">promoted</span>
        )}
      </div>
    </div>
  );
}

export function Frontier({ data }: { data: F | null }) {
  const [open, setOpen] = useState(false);

  const header = (
    <div className="reg-top">
      <div className="board-tabs">
        <span className="board-tab on">The frontier</span>
      </div>
      <span className="label">
        {data && data.entries.length
          ? `${data.solvers} ${data.solvers === 1 ? "solver" : "solvers"} · ${data.submissions} promoted ${
              data.submissions === 1 ? "submission" : "submissions"
            }`
          : "open challenge · no submissions yet"}
      </span>
    </div>
  );

  // Honest empty state. The challenge is real and the baseline is measured;
  // nobody has beaten it yet, and saying so is better than an empty table
  // implying the board failed to load.
  if (!data || data.entries.length === 0) {
    return (
      <section id="frontier" className="register frontier">
        {header}
        <div className="fr-empty">
          <p>
            Catching a provider that swaps the model it promised you is an unsolved problem, so
            it is posed as one. <b>{data?.benchmark ?? "attest-challenge"}</b> scores a detector on
            a labelled corpus of substitutions this project controls — different family, different
            size, requantised, and an endpoint that recognises audit traffic and answers honestly
            for it.
          </p>
          <p>
            The shipped detector — the rule producing the verdicts in the register above — is a
            mean similarity with a threshold. On that corpus it catches <b>10 of 11</b>{" "}
            substitutions and falsely accuses <b>3 of 6</b> honest pairs, so it scores{" "}
            <b>zero</b>: the run is rejected, not ranked. Any valid run above zero is already
            past the state of the art, and whoever gets there becomes the detector this site
            audits with.
          </p>
          <p>
            The reason is measured rather than assumed. Across independent sampling sessions the
            honest pairs land at <b>0.420&ndash;0.551</b> similarity and the substitutions at{" "}
            <b>0.330&ndash;0.490</b>. Those overlap, so <b>no threshold separates them</b> — not
            0.45, not any number. A single mean is the wrong measurement, and finding the right
            one is the open problem.
          </p>
          <p className="fr-actions">
            <a className="vsign" href={data?.url ?? CHALLENGE} target="_blank" rel="noopener noreferrer">
              Take the challenge →
            </a>
            <button className="fr-more" onClick={() => setOpen(!open)}>
              {open ? "Hide the scoring" : "How it is scored"}
            </button>
          </p>
          {open && (
            <div className="fr-rules">
              <p>
                <b>Score</b> is the share of substitutions you catch, 0–100.
              </p>
              <p>
                <b>Falsely accusing an honest provider does not cost you points — it rejects your
                run.</b>{" "}
                A detector that flags everything gets a perfect detection rate and scores zero.
                That is not a scoring quirk: a FAIL published here without a false-positive rate
                behind it is defamation, so the gate is the whole point.
              </p>
              <p className="muted">
                Negatives are the same weights sampled in two different sessions, not the same call
                twice — at temperature 0 the problem collapses into a byte comparison and measures
                nothing. The corpus&apos;s hard tiers use 1B models, which are noisier between
                sessions than the models real providers serve, so it is deliberately harder than
                the register it feeds.
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="frontier" className="register frontier">
      {header}
      <div className="reg-head fr-head">
        <span className="fr-rank">№</span>
        <span>Solver</span>
        <span className="r">Score</span>
        <span className="col-delta r">Δ</span>
        <span className="r">State</span>
      </div>
      {data.entries.map((e) => (
        <Row key={`${e.solver}-${e.submission ?? e.rank}`} e={e} baseline={data.baseline} />
      ))}
      <p className="fr-foot">
        Scored on a held-out corpus solvers never see, in a sandbox with no network.{" "}
        <a href={data.url ?? CHALLENGE} target="_blank" rel="noopener noreferrer">
          Take the challenge →
        </a>
      </p>
    </section>
  );
}
