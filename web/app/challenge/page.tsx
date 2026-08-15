import type { Metadata } from "next";
import { getFrontier } from "@/lib/data";
import { ChallengeHeader } from "@/components/challenge/ChallengeHeader";
import { ChallengeHero } from "@/components/challenge/Hero";
import { ResultsCard } from "@/components/challenge/ResultsCard";
import { ChallengeFooter } from "@/components/challenge/ChallengeFooter";

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
      {/* One bar only, like yukon.org/mlxfast. .challenge-attest re-declares the
          semantic tokens, which is how Yukon themes an individual challenge, and
          it also themes the modals that ChallengeHeader opens. */}
      <main className="page challenge-attest ch-page">
        <ChallengeHeader />
        <ChallengeHero data={frontier} />
        <ResultsCard data={frontier} />
        <ChallengeFooter data={frontier} />
      </main>
    </>
  );
}
