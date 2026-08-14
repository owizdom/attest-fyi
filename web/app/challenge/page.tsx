import type { Metadata } from "next";
import { getFrontier } from "@/lib/data";
import { TopBar } from "@/components/TopBar";
import { ChallengeHeader } from "@/components/challenge/ChallengeHeader";
import { ChallengeHero } from "@/components/challenge/Hero";
import { Leaderboard } from "@/components/challenge/Leaderboard";
import { Scoring } from "@/components/challenge/Scoring";

// Same build-time read as the homepage: the board comes from committed results,
// so there is no runtime filesystem access on the serverless host.
export const dynamic = "force-static";

const TITLE = "attest-challenge — catch an AI provider serving the wrong model";
const DESC =
  "A provider promises you one model and can quietly run a cheaper one instead. The security seal still passes. Write code that spots the swap.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: "https://attest.fyi/challenge", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function ChallengePage() {
  const frontier = getFrontier();
  return (
    <>
      <TopBar />
      {/* .challenge-attest re-declares the semantic tokens, which is how Yukon
          themes an individual challenge. Today it inherits the platform indigo. */}
      <main className="page challenge-attest ch-page">
        <ChallengeHeader />
        <ChallengeHero data={frontier} />
        <Leaderboard data={frontier} />
        <Scoring />
        <footer className="footer">
          <span>
            <span className="seal-mark">◉</span>
            A challenge from <a href="/">attest.fyi</a>.
          </span>
          <span className="muted">{frontier?.benchmark ?? "attest-challenge"}</span>
        </footer>
      </main>
    </>
  );
}
