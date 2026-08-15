import type { Frontier } from "@/lib/types";

// mlxfast closes with the harness commit the scores came from, then the scoring
// caveat, then legal. Naming the commit is the point: a score means nothing
// without the code that produced it.
export function ChallengeFooter({ data }: { data: Frontier | null }) {
  const repo = data?.harness_repo ?? "owizdom/attest-challenge";
  const sha = data?.harness_sha;
  return (
    <footer className="ch-foot">
      <div className="ch-foot-top">
        <span className="ch-foot-harness">
          harness:{" "}
          <a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer">{repo}</a>
          {sha ? (
            <>
              {" @ "}
              <a href={`https://github.com/${repo}/commit/${sha}`} target="_blank" rel="noopener noreferrer">
                {sha}
              </a>
            </>
          ) : null}
        </span>
        <span className="ch-foot-note">
          official scores come from CI on Linux under bubblewrap; the same detector can land a few
          points apart on other hardware, so iterate locally against the dev split
        </span>
      </div>
      <div className="ch-foot-legal">
        <span>
          <span className="seal-mark">◉</span> A challenge from <a href="/">attest.fyi</a>
        </span>
        <span className="ch-foot-links">
          <a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="/llms.txt">llms.txt</a>
        </span>
      </div>
    </footer>
  );
}
