// yukon.org/mlxfast header: "Yukon │ MLX.fast with ◉poolside" on the left, then
// pill buttons on the right. Same shape, our names.
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
      </span>
    </nav>
  );
}
