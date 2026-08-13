import { Actions } from "./Actions";

// The platform bar. Full-bleed and fixed-height on the chrome surface, sitting
// outside `.page`, because this strip belongs to Yukon rather than to
// attest.fyi. `.topbar` is display:contents so the header's children lay out
// directly in `.chrome-inner`.
export function TopBar() {
  return (
    <div className="chrome">
      <div className="chrome-inner">
        <header className="topbar">
          <span className="wordmark">attest<span className="dot">.</span>fyi</span>
          <nav className="nav">
            <a href="/challenge">Challenge</a>
            <Actions />
            <a href="https://github.com/owizdom/attest-fyi" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
        </header>
      </div>
    </div>
  );
}
