"use client";
import { useState } from "react";
import type { Frontier, FrontierPoint } from "@/lib/types";

// yukon.org/mlxfast, rebuilt: mark + a sentence with the headline number set in
// an inverted plate, then a framed chart panel with control chips.
//
// The chips are real. They started out as decorative spans copied from Yukon's
// chrome, which is worse than having none: a control that does nothing is a lie
// about the page. Record/By model and Lin/Log both switch the view, and the
// range chips filter the series.

const PLOT = { w: 1000, h: 262, pad: { t: 16, r: 66, b: 28, l: 4 } };

type View = "record" | "model";
type Scale = "lin" | "log";
type Range = "7d" | "30d" | "all";

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, all: 1e6 };

function daysAgo(iso: string): number {
  const then = Date.parse(iso + "T00:00:00Z");
  return (Date.now() - then) / 86_400_000;
}

export function ChallengeHero({ data }: { data: Frontier | null }) {
  const [view, setView] = useState<View>("record");
  const [scale, setScale] = useState<Scale>("lin");
  const [range, setRange] = useState<Range>("all");

  const all: FrontierPoint[] = data?.history ?? [];
  const pts = all.filter((p) => daysAgo(p.at) <= RANGE_DAYS[range]);
  const best = data?.entries?.[0]?.score ?? data?.baseline ?? 0;

  const { w, h, pad } = PLOT;
  const y0 = h - pad.b;
  const xEnd = w - pad.r;

  // log needs a floor: a rejected run scores exactly 0 and log(0) has no place
  // on a chart.
  const yFor = (v: number) => {
    const f = scale === "log" ? Math.log10(Math.max(v, 1) ) / 2 : v / 100;
    return pad.t + (1 - f) * (y0 - pad.t);
  };
  const grid = scale === "log" ? [100, 10, 1] : [100, 50];

  const xFor = (i: number) => (pts.length < 2 ? xEnd : pad.l + (i / (pts.length - 1)) * (xEnd - pad.l));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.score)}`).join(" ");

  const chip = (on: boolean) => `hc-chip${on ? " on" : ""}`;

  return (
    <section className="hero-card">
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
            title="A provider promises you one model and can quietly run a cheaper one. The security seal still passes. This is the share of swapped providers the best detector catches without falsely accusing honest ones."
          >
            i
          </span>
        </h1>
      </div>

      <div className="hero-chart">
        <div className="hc-bar">
          <div className="hc-seg">
            <button className={chip(view === "record")} onClick={() => setView("record")}>Record</button>
            <button className={chip(view === "model")} onClick={() => setView("model")}>By model</button>
          </div>
          <div className="hc-seg">
            <button className={chip(scale === "lin")} onClick={() => setScale("lin")}>Lin</button>
            <button className={chip(scale === "log")} onClick={() => setScale("log")}>Log</button>
            <span className="hc-div" aria-hidden="true" />
            {(["7d", "30d", "all"] as Range[]).map((r) => (
              <button key={r} className={chip(range === r)} onClick={() => setRange(r)}>
                {r === "all" ? "All" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {view === "record" ? (
          <div className="hc-plot">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
                 aria-label={`Best score over time, currently ${best.toFixed(1)} percent`}>
              {grid.map((g) => (
                <g key={g}>
                  <line className="hc-grid" x1={pad.l} y1={yFor(g)} x2={xEnd} y2={yFor(g)} />
                  <text className="hc-ylab" x={xEnd + 10} y={yFor(g) + 4}>{g.toFixed(1)}%</text>
                </g>
              ))}
              <line className="hc-base" x1={pad.l} y1={y0} x2={xEnd} y2={y0} />
              <text className="hc-tag" x={pad.l} y={y0 + 18}>baseline</text>

              {pts.length > 1 ? <path className="hc-line" d={line} /> : (
                <line className="hc-line" x1={pad.l} y1={yFor(best)} x2={xEnd} y2={yFor(best)} />
              )}
              {pts.map((p, i) => (
                <circle key={p.at} className={`hc-dot${p.valid === false ? " void" : ""}`}
                        cx={xFor(i)} cy={yFor(p.score)} r="4.5">
                  <title>{`${p.at} · ${p.who} · ${p.score.toFixed(2)}${p.valid === false ? " (disqualified)" : ""}`}</title>
                </circle>
              ))}
              <text className="hc-tag" x={xEnd + 10} y={yFor(best) - 9}>now</text>
              <text className="hc-ylab" x={xEnd + 10} y={yFor(best) + 8}>{best.toFixed(1)}%</text>
            </svg>
          </div>
        ) : (
          <div className="hc-models">
            {pts.length === 0 ? (
              <p className="hc-empty">Nothing in this range.</p>
            ) : (
              [...pts].reverse().map((p) => (
                <div className="hc-model" key={p.at}>
                  <span className="hc-model-score">{p.score.toFixed(2)}</span>
                  <span className="hc-model-name">{p.model}</span>
                  <span className="hc-model-who">{p.who}</span>
                  <span className="hc-model-at">
                    {p.at}
                    {p.valid === false ? <em> disqualified</em> : null}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <p className="hc-foot">
          {pts.length > 1
            ? `${pts.length} scored detectors · the line moves when someone beats the one running today`
            : "no submissions yet · the line moves the first time someone beats the code running today"}
        </p>
      </div>
    </section>
  );
}
