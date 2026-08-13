// The verdict mark: intact (pass), half (partial), broken (fail), faint ring
// (skipped/unknown).
//
// No colours here. Every fill and stroke is `currentColor`, and the verdict goes
// into the className so globals.css owns the palette. That is what lets the mark
// retheme under `.challenge-attest` without touching this file, and it is why
// this can stay a server component: reading CSS variables from JS would need
// getComputedStyle, which forces "use client" and breaks the SSR paint.
export function Seal({ verdict }: { verdict: string }) {
  const cls = `seal-glyph ${verdict}`;

  if (verdict === "pass") {
    return (
      <svg className={cls} viewBox="0 0 22 22" aria-label="intact seal">
        <circle cx="11" cy="11" r="8.5" fill="currentColor" />
        {/* punched out of the disc, so it has to match the page behind it */}
        <path
          d="M11 5.6l1.25 2.85 3.1.28-2.3 2.07.72 3.05L11 14.2l-2.77 1.71.72-3.05-2.3-2.07 3.1-.28z"
          fill="var(--bg)"
        />
      </svg>
    );
  }
  if (verdict === "partial") {
    return (
      <svg className={cls} viewBox="0 0 22 22" aria-label="half seal">
        <circle cx="11" cy="11" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 2.5 A8.5 8.5 0 0 0 11 19.5 Z" fill="currentColor" opacity="0.85" />
      </svg>
    );
  }
  if (verdict === "fail") {
    return (
      <svg className={cls} viewBox="0 0 22 22" aria-label="broken seal">
        <circle
          cx="11" cy="11" r="8.5" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeDasharray="34 10" strokeDashoffset="5"
        />
        <path d="M11 2.6 L9.3 7.8 L12.2 11 L9.3 14.2 L11 19.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 22 22" aria-label="no seal">
      <circle
        cx="11" cy="11" r="8.5" fill="none" stroke="currentColor"
        strokeWidth="1.3" strokeDasharray="2 3" opacity="0.7"
      />
    </svg>
  );
}
