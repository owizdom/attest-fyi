"use client";
import { useMemo, useState } from "react";
import type { Frontier, FrontierPoint } from "@/lib/types";

// The hero: mark, headline with the figure in an inverted plate, and a framed
// chart panel with working controls.

const PLOT = { w: 1000, h: 262, pad: { t: 16, r: 66, b: 28, l: 4 } };

type View = "record" | "model";
type Scale = "lin" | "log";
type Range = "7d" | "30d" | "all";
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, all: 1e6 };

// One line per model in the "By model" view. Assigned in first-seen order.
const SERIES = ["#c8f3ff", "#ffd8a8", "#c5f7d0", "#ffc9de", "#d9c9ff"];

const daysAgo = (iso: string) => (Date.now() - Date.parse(iso + "T00:00:00Z")) / 86_400_000;

/** Score for one tier, or overall. Tier strings look like "2/3". */
function scoreOf(p: FrontierPoint, tier: string): number {
  if (tier === "all") return p.score;
  const hit = p.by_tier?.[tier];
  if (!hit) return 0;
  const [got, of] = hit.split("/").map(Number);
  return of ? (got / of) * 100 : 0;
}

export function ChallengeHero({ data }: { data: Frontier | null }) {
  const [view, setView] = useState<View>("record");
  const [scale, setScale] = useState<Scale>("lin");
  const [range, setRange] = useState<Range>("all");
  const [tier, setTier] = useState<string>("all");

  const all = data?.history ?? [];
  const pts = useMemo(() => all.filter((p) => daysAgo(p.at) <= RANGE_DAYS[range]), [all, range]);

  // The headline follows the selector, so it always states what is on screen.
  const best = useMemo(() => {
    const valid = all.filter((p) => p.valid !== false);
    return valid.length ? Math.max(...valid.map((p) => scoreOf(p, tier))) : 0;
  }, [all, tier]);

  const tiers = useMemo(() => {
    const keys = new Set<string>();
    all.forEach((p) => Object.keys(p.by_tier ?? {}).forEach((k) => keys.add(k)));
    return [...keys].sort();
  }, [all]);

  const { w, h, pad } = PLOT;
  const y0 = h - pad.b;
  const xEnd = w - pad.r;
  const yFor = (v: number) => {
    const f = scale === "log" && view === "record" ? Math.log10(Math.max(v, 1)) / 2 : v / 100;
    return pad.t + (1 - f) * (y0 - pad.t);
  };
  const grid = scale === "log" && view === "record" ? [100, 10, 1] : [100, 50];
  const xFor = (i: number, n: number) => (n < 2 ? xEnd : pad.l + (i / (n - 1)) * (xEnd - pad.l));

  /** A record holds its value until someone beats it, so the path steps. */
  const stepPath = (vals: { x: number; y: number }[]) =>
    vals
      .map((v, i) => (i === 0 ? `M${v.x},${v.y}` : `H${v.x}V${v.y}`))
      .join(" ") + (vals.length ? ` H${xEnd}` : "");

  const recordPts = pts.map((p, i) => ({ x: xFor(i, pts.length), y: yFor(scoreOf(p, tier)), p }));

  // "By model": each model's own running best over time.
  const models = useMemo(() => {
    const names: string[] = [];
    pts.forEach((p) => !names.includes(p.model) && names.push(p.model));
    return names.map((name, mi) => {
      let running = 0;
      const vals = pts.map((p, i) => {
        if (p.model === name && p.valid !== false) running = Math.max(running, scoreOf(p, tier));
        return { x: xFor(i, pts.length), y: yFor(running) };
      });
      const total = pts
        .filter((p) => p.model === name && p.valid !== false)
        .reduce((s, p) => s + (p.added ?? 0), 0);
      return { name, colour: SERIES[mi % SERIES.length], vals, total };
    });
  }, [pts, tier, scale]);

  const chip = (on: boolean) => `hc-chip${on ? " on" : ""}`;

  return (
    <section className="hero-card">
      {/* One ray per corpus pair, lit for caught. Decoration that happens to be
          the result. */}
      <svg className="hero-fan" viewBox="0 0 400 400" aria-hidden="true">
        {Array.from({ length: 22 }).map((_, i) => {
          const a = (-92 + i * 7.4) * (Math.PI / 180);
          const lit = i < Math.round((best / 100) * 22);
          return (
            <line
              key={i}
              x1={200} y1={200}
              x2={200 + 186 * Math.cos(a)} y2={200 + 186 * Math.sin(a)}
              stroke="currentColor" strokeWidth={lit ? 9 : 4}
              opacity={lit ? 0.2 : 0.07}
            />
          );
        })}
      </svg>

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
          <span className="hero-pick">
            <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="which tier">
              <option value="all">All tiers</option>
              {tiers.map((t) => (
                <option key={t} value={t}>Tier {t}</option>
              ))}
            </select>
            <span className="hero-pick-face">
              {tier === "all" ? "All tiers" : `Tier ${tier}`}
              <em aria-hidden="true">⌄</em>
            </span>
          </span>{" "}
          <span className="hero-h-rest">
            get caught <span className="hero-plate">{best.toFixed(1)}%</span> of the time.
            <span
              className="hero-i"
              title="A provider promises you one model and can quietly run a cheaper one. The security seal still passes. This is the share of swapped providers the best detector catches without falsely accusing honest ones."
            >
              i
            </span>
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
            {view === "record" ? (
              <>
                <button className={chip(scale === "lin")} onClick={() => setScale("lin")}>Lin</button>
                <button className={chip(scale === "log")} onClick={() => setScale("log")}>Log</button>
                <span className="hc-div" aria-hidden="true" />
              </>
            ) : null}
            {(["7d", "30d", "all"] as Range[]).map((r) => (
              <button key={r} className={chip(range === r)} onClick={() => setRange(r)}>
                {r === "all" ? "All" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

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

            {view === "record" ? (
              <>
                <path className="hc-line" d={stepPath(recordPts)} />
                {recordPts.map(({ x, y, p }) => (
                  <circle key={p.at + p.who} className={`hc-dot${p.valid === false ? " void" : ""}`}
                          cx={x} cy={y} r="4.5">
                    <title>{`${p.at} · ${p.who} · ${scoreOf(p, tier).toFixed(2)}${p.valid === false ? " (disqualified)" : ""}`}</title>
                  </circle>
                ))}
                <text className="hc-tag" x={xEnd + 10} y={yFor(best) - 9}>now</text>
              </>
            ) : (
              models.map((m) => (
                <path key={m.name} d={stepPath(m.vals)} fill="none" stroke={m.colour} strokeWidth="2" />
              ))
            )}
          </svg>
        </div>

        {view === "model" ? (
          <div className="hc-legend">
            {models.map((m) => (
              <span className="hc-key" key={m.name}>
                <i style={{ background: m.colour }} aria-hidden="true" />
                {m.name}
                <em>{m.total > 0 ? `+${m.total.toFixed(2)} pts` : "no gain"}</em>
              </span>
            ))}
          </div>
        ) : null}

        <p className="hc-foot">
          {pts.length > 1
            ? `${pts.length} scored runs · the line moves when someone beats the one running today`
            : "no submissions yet · the line moves the first time someone beats the code running today"}
        </p>
      </div>
    </section>
  );
}
