import { getLatest, getTasks, getFrontier } from "@/lib/data";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { Register } from "@/components/Register";
import { Frontier } from "@/components/Frontier";

// Static: the board is read from committed results at BUILD time (where the repo
// root is present) and baked, so there's no runtime filesystem read on the
// serverless host. A new cycle / signer is a git commit, which redeploys.
export const dynamic = "force-static";

export default function Page() {
  const latest = getLatest();
  const tasks = getTasks();
  const frontier = getFrontier();
  return (
    <main className="page">
      <TopBar />
      <Hero latest={latest} />
      <Register providers={latest?.providers ?? []} checked={latest?.generated_at ?? ""} tasks={tasks} />
      <Frontier data={frontier} />
      <footer className="footer">
        <span>
          <span className="seal-mark">✦</span>
          attest.fyi — a benchmark for verifiable inference.
          {latest ? ` Live cycle ${latest.cycle}.` : ""}
          {latest?.detector ? (
            <>
              {" "}Verdicts decided by <a href="#frontier">{latest.detector.name}</a>
              {latest.detector.score != null ? ` (${latest.detector.score} on attest-challenge)` : ""}.
            </>
          ) : null}
        </span>
        <span className="muted">{latest?.seed_commit ? latest.seed_commit.slice(0, 24) + "…" : ""}</span>
      </footer>
    </main>
  );
}
