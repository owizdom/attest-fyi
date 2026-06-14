import { getLatest, getTasks } from "@/lib/data";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { Register } from "@/components/Register";

export const dynamic = "force-dynamic";

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
