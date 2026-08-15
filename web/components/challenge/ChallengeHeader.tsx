import { ChallengeActions } from "./ChallengeActions";

// The only bar on this page, matching yukon.org/mlxfast, which has one strip
// rather than a platform bar stacked on a challenge bar. Everything the page
// needs lives here, and the two action pills open the benchmark's own modals
// rather than the register's.
export function ChallengeHeader() {
  return (
    <nav className="ch-strip">
      <span className="ch-brand">
        <a href="/">attest.fyi</a>
        <span className="ch-brand-sep">│</span>
        <span className="ch-brand-name">attest-challenge</span>
      </span>
      <span className="ch-strip-nav">
        <a className="ch-pill" href="/#register">All challenges</a>
        <a className="ch-pill" href="#leaderboard">Leaderboard</a>
        <ChallengeActions />
        <a className="ch-pill" href="https://github.com/owizdom/attest-challenge"
           target="_blank" rel="noopener noreferrer">GitHub</a>
      </span>
    </nav>
  );
}
