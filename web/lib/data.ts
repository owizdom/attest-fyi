import fs from "node:fs";
import path from "node:path";
import type { Latest, HistoryPoint } from "./types";

// The Python engine writes cycle results here; the site reads them directly.
const RESULTS = path.join(process.cwd(), "..", "results");

function readJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

export function getLatest(): Latest | null {
  const d = readJson<Latest>(path.join(RESULTS, "latest.json"));
  if (!d) return null;
  const prev = readJson<Latest>(path.join(RESULTS, `cycle-${d.cycle - 1}.json`));
  const prevScore: Record<string, number | null> = {};
  prev?.providers?.forEach((p) => (prevScore[p.id] = p.score));
  d.providers?.forEach((p) => {
    const ps = prevScore[p.id];
    p.delta = p.score != null && ps != null ? p.score - ps : null;
  });
  return d;
}

export function getHistory(): HistoryPoint[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(RESULTS).filter((f) => /^cycle-\d+\.json$/.test(f));
  } catch {
    return [];
  }
  files.sort((a, b) => parseInt(a.slice(6), 10) - parseInt(b.slice(6), 10));
  const out: HistoryPoint[] = [];
  for (const f of files) {
    const d = readJson<Latest>(path.join(RESULTS, f));
    if (!d) continue;
    const s = d.summary;
    out.push({
      cycle: d.cycle,
      generated_at: d.generated_at,
      trust_gap_pct: s.trust_gap_pct,
      pass: s.pass,
      partial: s.partial,
      fail: s.fail,
      scored: s.scored,
      with_reference: s.with_reference,
      pass_rate_pct: s.scored ? Math.round((100 * s.pass) / s.scored) : 0,
    });
  }
  return out;
}
