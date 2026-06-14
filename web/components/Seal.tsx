// Verdict as a wax seal: intact (pass), half-pressed (partial), broken (fail),
// faint un-pressed ring (skipped/unknown).
export function Seal({ verdict }: { verdict: string }) {
  const seal = "#7c2018";
  const red = "#963126";
  const faint = "#8a7c62";
  const paper = "#f4ecd8";

  if (verdict === "pass") {
    return (
      <svg className="seal-glyph" viewBox="0 0 22 22" aria-label="intact seal">
        <circle cx="11" cy="11" r="8.5" fill={seal} />
        <path d="M11 5.6l1.25 2.85 3.1.28-2.3 2.07.72 3.05L11 14.2l-2.77 1.71.72-3.05-2.3-2.07 3.1-.28z" fill={paper} />
      </svg>
    );
  }
  if (verdict === "partial") {
    return (
      <svg className="seal-glyph" viewBox="0 0 22 22" aria-label="half seal">
        <circle cx="11" cy="11" r="8.5" fill="none" stroke={seal} strokeWidth="1.6" />
        <path d="M11 2.5 A8.5 8.5 0 0 0 11 19.5 Z" fill={seal} opacity="0.85" />
      </svg>
    );
  }
  if (verdict === "fail") {
    return (
      <svg className="seal-glyph" viewBox="0 0 22 22" aria-label="broken seal">
        <circle cx="11" cy="11" r="8.5" fill="none" stroke={red} strokeWidth="1.6" strokeDasharray="34 10" strokeDashoffset="5" />
        <path d="M11 2.6 L9.3 7.8 L12.2 11 L9.3 14.2 L11 19.4" fill="none" stroke={red} strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg className="seal-glyph" viewBox="0 0 22 22" aria-label="no seal">
      <circle cx="11" cy="11" r="8.5" fill="none" stroke={faint} strokeWidth="1.3" strokeDasharray="2 3" opacity="0.7" />
    </svg>
  );
}
