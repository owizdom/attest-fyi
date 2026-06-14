"use client";
import { useRef, useState } from "react";
import type { HistoryPoint } from "@/lib/types";

export function Sparkline({ history }: { history: HistoryPoint[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const W = 800, H = 90, L = 4, R = 796, T = 12, B = 78;
  const n = history.length;
  const x = (i: number) => (n <= 1 ? L : L + (i / (n - 1)) * (R - L));
  const y = (v: number) => B - (v / 100) * (B - T);

  const pts = history.map((d, i) => ({ cx: x(i), cy: y(d.trust_gap_pct), d }));
  const line = pts.map((p) => `${p.cx},${p.cy}`).join(" ");
  const now = history[n - 1];

  function onMove(e: React.MouseEvent) {
    if (!ref.current || !n) return;
    const rect = ref.current.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.cx - vx) < Math.abs(best.cx - vx)) best = p;
    setTip({ x: e.clientX, y: e.clientY, text: `cycle ${best.d.cycle} · gap ${best.d.trust_gap_pct}%` });
  }

  return (
    <section className="spark">
      <div className="spark-top">
        <span className="label">Trust gap, by cycle</span>
        <span className="spark-now">{now ? `${now.trust_gap_pct}%` : "—"}</span>
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        <line className="base" x1={L} y1={B} x2={R} y2={B} />
        {n > 0 && <polyline className="line" points={n === 1 ? `${line} ${R},${pts[0].cy}` : line} />}
        {pts.map((p, i) => (
          <circle key={i} className={i === n - 1 ? "dot dot-now" : "dot"} cx={p.cx} cy={p.cy} r={i === n - 1 ? 3.5 : 2.5} />
        ))}
        {n > 0 && <text className="lbl" x={L} y={H - 1}>cycle {history[0].cycle}</text>}
        {n > 0 && <text className="lbl" x={R} y={H - 1} textAnchor="end">cycle {now.cycle}</text>}
      </svg>
      {tip && <div className="spark-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    </section>
  );
}
