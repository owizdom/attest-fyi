// Yukon's challenge strip: "Yukon SNARK.fast" on the left, nav on the right.
export function ChallengeHeader() {
  return (
    <nav className="ch-strip">
      <span className="ch-brand">
        <a href="/">attest.fyi</a>
        <span className="ch-brand-name">attest-challenge</span>
      </span>
      <span className="ch-strip-nav">
        <a href="/#register">All boards</a>
        <a href="#leaderboard">Leaderboard</a>
      </span>
    </nav>
  );
}
