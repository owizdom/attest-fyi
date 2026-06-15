import { getLatest, getTasks } from "@/lib/data";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { Register } from "@/components/Register";

// Static: the board is read from committed results at BUILD time (where the repo
// root is present) and baked, so there's no runtime filesystem read on the
// serverless host. A new cycle / signer is a git commit, which redeploys.
export const dynamic = "force-static";

export default function Page() {
  const latest = getLatest();
  const tasks = getTasks();
  return (
    <main className="page">
      <TopBar />
      <Hero latest={latest} />
      <Register providers={latest?.providers ?? []} checked={latest?.generated_at ?? ""} tasks={tasks} />
      <footer className="footer">
        <span>
          <span className="seal-mark">✦</span>
          attest.fyi — a benchmark for verifiable inference.
          {latest ? ` Live cycle ${latest.cycle}.` : ""}
        </span>
        <span className="muted">{latest?.seed_commit ? latest.seed_commit.slice(0, 24) + "…" : ""}</span>
      </footer>
    </main>
  );
}
