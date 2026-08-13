import fs from "node:fs";
import path from "node:path";
import type { Latest, Verifier, Task, Frontier } from "./types";

// The Python engine writes cycle results here; the site reads them directly.
const RESULTS = path.join(process.cwd(), "..", "results");
// Public register of independent verifiers, appended only via the sign workflow.
const VERIFIERS = path.join(process.cwd(), "..", "verifiers.json");
// Open work: verifications we couldn't finish, for agents/people to pick up.
const TASKS = path.join(process.cwd(), "..", "tasks", "index.json");
// Promoted submissions to the attest-challenge benchmark on Yukon. Committed
// by the sync workflow so the board renders without a runtime API call.
const FRONTIER = path.join(process.cwd(), "..", "results", "frontier.json");

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
  const verifiers = readJson<Record<string, Verifier[]>>(VERIFIERS) ?? {};
  d.providers?.forEach((p) => {
    const ps = prevScore[p.id];
    p.delta = p.score != null && ps != null ? p.score - ps : null;
    p.verifiers = Array.isArray(verifiers[p.id]) ? verifiers[p.id] : [];
  });
  return d;
}

export function getTasks(): Task[] {
  const d = readJson<{ tasks: Task[] }>(TASKS);
  return Array.isArray(d?.tasks) ? d!.tasks : [];
}

export function getFrontier(): Frontier | null {
  const d = readJson<Frontier>(FRONTIER);
  if (!d || !Array.isArray(d.entries)) return null;
  // Rank is derived here, not trusted from the file: the board must agree
  // with the scores it is displaying.
  d.entries = [...d.entries].sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  return d;
}
