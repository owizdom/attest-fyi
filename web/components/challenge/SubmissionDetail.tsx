"use client";
import type { FrontierPoint } from "@/lib/types";
import { Modal } from "../Modal";

// Opened by clicking a row in the results card. Header carries who, what model
// they used, and whether the run counted; body carries the numbers behind the
// score and the note they wrote.
//
// `note` is plain sentences, not markdown, so it splits on blank lines and
// renders as paragraphs. No renderer dependency for that.

function Avatar({ who }: { who: string }) {
  // "baseline" is not a GitHub account, so it gets a mark instead of a 404.
  if (who === "baseline") return <span className="sd-mark" aria-hidden="true">◉</span>;
  return (
    <img className="sd-face" src={`https://github.com/${who}.png?size=64`} alt="" loading="lazy" />
  );
}

export function SubmissionDetail({ p, onClose }: { p: FrontierPoint; onClose: () => void }) {
  const valid = p.valid !== false;
  const created = new Date(p.at + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });

  const header = (
    <div className="sd-head">
      <Avatar who={p.who} />
      <span className="sd-who">{p.who}</span>
      <span className="sd-model">{p.model}</span>
      <span className={`sd-badge${valid ? "" : " void"}`}>{valid ? "Promoted" : "Disqualified"}</span>
      {p.pr ? (
        <a className="sd-pr" href={p.pr} target="_blank" rel="noopener noreferrer">
          View code ↗
        </a>
      ) : null}
    </div>
  );

  return (
    <Modal title={header} onClose={onClose} wide>
      <div className="sd-stats">
        <div>
          <span className="sd-k">Score</span>
          <span className="sd-v">{p.score.toFixed(2)}</span>
          {p.caught != null && p.swaps != null ? (
            <span className="sd-sub">{p.caught} of {p.swaps} swaps caught</span>
          ) : null}
        </div>
        <div>
          <span className="sd-k">Added</span>
          <span className={`sd-v ${valid && p.added ? "up" : "flat"}`}>
            {!valid ? "—" : p.added ? `+${p.added.toFixed(2)}` : "—"}
          </span>
          <span className="sd-sub">
            {valid ? "over the previous best" : "the run did not count"}
          </span>
        </div>
        <div>
          <span className="sd-k">Created</span>
          <span className="sd-v sd-date">{created}</span>
          {p.false_accusations != null && p.negatives != null ? (
            <span className="sd-sub">
              {p.false_accusations} of {p.negatives} honest wrongly accused
            </span>
          ) : null}
        </div>
      </div>

      {p.by_tier ? (
        <div className="sd-section">
          <span className="sd-k">Caught by tier</span>
          <div className="sd-tiers">
            {Object.entries(p.by_tier).map(([tier, hit]) => {
              const [got, of] = hit.split("/").map(Number);
              return (
                <span className={`sd-tier${got === 0 ? " none" : got === of ? " all" : ""}`} key={tier}>
                  <em>t{tier}</em> {hit}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {p.note ? (
        <div className="sd-section">
          <span className="sd-k">Note</span>
          <div className="sd-note">
            {p.note.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
