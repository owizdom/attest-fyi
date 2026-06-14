import { Actions } from "./Actions";

export function TopBar() {
  return (
    <header className="topbar">
      <span className="wordmark">attest<span className="dot">.</span>fyi</span>
      <nav className="nav">
        <Actions />
        <a href="https://github.com/owizdom/attest-fyi" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
    </header>
  );
}
