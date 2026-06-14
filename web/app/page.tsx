import { getLatest, getHistory } from "@/lib/data";
import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { Register } from "@/components/Register";
import { Sparkline } from "@/components/Sparkline";

export const dynamic = "force-dynamic";

export default function Page() {
  const latest = getLatest();
  const history = getHistory();
  return (
    <main className="page">
      <TopBar />
      <Hero latest={latest} />
      <Register providers={latest?.providers ?? []} checked={latest?.generated_at ?? ""} />
      <Sparkline history={history} />
      <footer className="footer">
        <span>
          <span className="seal-mark">✦</span>
          attest.fail — a benchmark for verifiable inference.
          {latest ? ` Live cycle ${latest.cycle}.` : ""}
        </span>
        <span className="muted">{latest?.seed_commit ? latest.seed_commit.slice(0, 24) + "…" : ""}</span>
      </footer>
    </main>
  );
}
