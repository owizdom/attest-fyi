"use client";
import { useMemo, useState } from "react";
import type { Frontier, FrontierPoint } from "@/lib/types";
import { SubmissionDetail } from "./SubmissionDetail";

// The card under the hero: two tabs over the same data.
//
//   Improvement History  one row per scored run, newest first
//   Leaderboard          the same runs folded by solver
//
// Every row opens the detail modal, by click or by Enter.

type Tab = "history" | "board";

function Avatar({ who }: { who: string }) {
  if (who === "baseline") return <span className="rc-mark" aria-hidden="true">◉</span>;
  return <img className="rc-face" src={`https://github.com/${who}.png?size=48`} alt="" loading="lazy" />;
}

function shortDate(at: string) {
  return new Date(at + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

/** Runs folded by solver: what each person added in total, and their best run. */
function bySolver(history: FrontierPoint[]) {
  const acc = new Map<string, { who: string; model: string; gain: number; best: number; runs: number }>();
  for (const p of history) {
    const cur = acc.get(p.who) ?? { who: p.who, model: p.model, gain: 0, best: 0, runs: 0 };
    cur.runs += 1;
    if (p.valid !== false) {
      cur.gain += p.added ?? 0;
      if (p.score > cur.best) {
        cur.best = p.score;
        cur.model = p.model;
      }
    }
    acc.set(p.who, cur);
  }
  return [...acc.values()].sort((a, b) => b.gain - a.gain);
}

export function ResultsCard({ data }: { data: Frontier | null }) {
  const [tab, setTab] = useState<Tab>("history");
  const [sel, setSel] = useState<FrontierPoint | null>(null);

  const history = useMemo(() => [...(data?.history ?? [])].reverse(), [data]);
  const solvers = useMemo(() => bySolver(data?.history ?? []), [data]);
  // "baseline" is a run the setter wrote, not a competitor, so it is on the
  // board but never in the head count.
  const people = useMemo(() => solvers.filter((s) => s.who !== "baseline").length, [solvers]);

  const best = history.find((p) => p.valid !== false);
  const record = best?.score ?? data?.baseline ?? 0;
  const top = solvers[0];

  const open = (p: FrontierPoint) => setSel(p);
  const onKey = (p: FrontierPoint) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(p);
    }
  };

  return (
    <section id="leaderboard" className="rc">
      <div className="rc-top">
        <div className="rc-tabs">
          <button className={`rc-tab${tab === "history" ? " on" : ""}`} onClick={() => setTab("history")}>
            Improvement History
          </button>
          <button className={`rc-tab${tab === "board" ? " on" : ""}`} onClick={() => setTab("board")}>
            Leaderboard
          </button>
        </div>
        <div className="rc-record">
          <span className="rc-record-k">Current record</span>
          <span className="rc-record-v">
            {tab === "board" && top ? `+${top.gain.toFixed(2)}%` : record.toFixed(2)}
          </span>
          <span className="rc-record-u">
            {tab === "board"
              ? top
                ? `${top.who} · ${top.runs} ${top.runs === 1 ? "run" : "runs"}`
                : "no runs yet"
              : best?.caught != null
                ? `${best.caught} of ${best.swaps} swaps caught`
                : "out of 100"}
          </span>
        </div>
      </div>

      <p className="rc-count">
        {(data?.submissions ?? 0) > 0 ? (
          <>
            {data?.submissions} promoted {data?.submissions === 1 ? "submission" : "submissions"},{" "}
            {people} {people === 1 ? "solver" : "solvers"}
          </>
        ) : (
          <>
            {history.length} scored {history.length === 1 ? "run" : "runs"}, no outside submissions
            yet
          </>
        )}
      </p>

      <p className="rc-caption">
        {tab === "history" ? (
          <>Ranked by date. <b>Green</b> shows what each run added.</>
        ) : (
          <>Ranked by total gain. Folded across every run a solver has scored.</>
        )}
      </p>

      {tab === "history" ? (
        <div className="rc-table">
          <div className="rc-head rc-row-h">
            <span>Solver</span>
            <span className="r">Score</span>
            <span className="r">Caught</span>
            <span className="r">False acc</span>
            <span className="r">Created</span>
            <span />
          </div>
          {history.map((p, i) => {
            const valid = p.valid !== false;
            return (
              <div
                className={`rc-row rc-row-h${i === 0 && valid ? " lead" : ""}${valid ? "" : " void"}`}
                key={p.at + p.who}
                role="button"
                tabIndex={0}
                onClick={() => open(p)}
                onKeyDown={onKey(p)}
              >
                <span className="rc-who">
                  <span className="rc-rank">{String(i + 1).padStart(2, "0")}</span>
                  <Avatar who={p.who} />
                  <span className="rc-name">{p.who}</span>
                  <span className="rc-model">{p.model}</span>
                </span>
                <span className="rc-fig r">
                  {p.score.toFixed(2)}
                  <em className={valid && p.added ? "up" : "flat"}>
                    {valid ? (p.added ? `+${p.added.toFixed(2)}` : "—") : "disqualified"}
                  </em>
                </span>
                <span className="rc-num r">{p.caught != null ? `${p.caught}/${p.swaps}` : "—"}</span>
                <span className="rc-num r">
                  {p.false_accusations != null ? `${p.false_accusations}/${p.negatives}` : "—"}
                </span>
                <span className="rc-at r">{shortDate(p.at)}</span>
                <span className="rc-chev" aria-hidden="true">›</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rc-table">
          <div className="rc-head rc-row-b">
            <span>Solver</span>
            <span className="r">Total gain</span>
            <span className="r">Best score</span>
            <span />
          </div>
          {solvers.map((s, i) => {
            const run = history.find((p) => p.who === s.who && p.score === s.best) ?? history[0];
            return (
              <div
                className={`rc-row rc-row-b${i === 0 ? " lead" : ""}`}
                key={s.who}
                role="button"
                tabIndex={0}
                onClick={() => open(run)}
                onKeyDown={onKey(run)}
              >
                <span className="rc-who">
                  <span className="rc-rank">{String(i + 1).padStart(2, "0")}</span>
                  <Avatar who={s.who} />
                  <span className="rc-name">{s.who}</span>
                  {i === 0 && s.gain > 0 ? <span className="rc-crown" title="leading">♛</span> : null}
                  {s.runs > 1 ? <span className="rc-runs">{s.runs} runs</span> : null}
                  <span className="rc-model">{s.model}</span>
                </span>
                <span className="rc-fig r">
                  <em className={s.gain > 0 ? "up" : "flat"}>
                    {s.gain > 0 ? `+${s.gain.toFixed(2)}%` : "—"}
                  </em>
                </span>
                <span className="rc-num r">{s.best.toFixed(2)}</span>
                <span className="rc-chev" aria-hidden="true">›</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="rc-note">
        The baseline is written by whoever sets the benchmark, who can see the answers, so it is
        shown for reference and never ranked against submissions.
      </p>

      {sel ? <SubmissionDetail p={sel} onClose={() => setSel(null)} /> : null}
    </section>
  );
}
