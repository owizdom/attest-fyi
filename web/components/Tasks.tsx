"use client";
import { useState } from "react";
import type { Task } from "@/lib/types";

const SITE = "https://attest.fyi";

function oneLiner(id: string): string {
  return `Read ${SITE}/llms.txt, then complete ${SITE}/t/${id} — verify a confidential-AI provider for the attest.fyi benchmark and open a PR with the captured evidence.`;
}

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="work-copy"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? "copied ✓" : "copy for your agent"}
    </button>
  );
}

// Headerless list — rendered inside the register's "Open work" tab.
const auditLine = `Read ${SITE}/llms.txt, then audit a confidential-AI provider for the attest.fyi board: write providers/<id>.json (schema in llms.txt), run "python3 attest.py audit <id>" with my key, and open a PR titled "verify: <id>". CI re-verifies the seal before it can land.`;

export function WorkList({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      {tasks.length ? (
      <div className="work-list">
        {tasks.map((t) => {
          const isOpen = open === t.id;
          return (
            <div className="work-item" key={t.id}>
              <div
                className="work-row"
                role="button"
                tabIndex={0}
                onClick={() => setOpen(isOpen ? null : t.id)}
                onKeyDown={(e) => e.key === "Enter" && setOpen(isOpen ? null : t.id)}
              >
                <span className="work-name">
                  {t.title}
                  <small>{t.type}{t.blocked_on ? ` · blocked: ${t.blocked_on}` : ""}</small>
                </span>
                <span className="work-right">
                  {t.contributors && t.contributors.length ? (
                    <span className="work-vs">
                      {t.contributors.slice(0, 4).map((c) => (
                        <img key={c} src={`https://github.com/${c}.png?size=40`} alt={c} loading="lazy" />
                      ))}
                    </span>
                  ) : null}
                  <span className={`work-status s-${t.status}`}>{t.status}</span>
                  <span className="work-chev">{isOpen ? "–" : "+"}</span>
                </span>
              </div>
              {isOpen ? (
                <div className="work-detail">
                  <p>{t.summary}</p>
                  <div className="work-actions">
                    <CopyLine text={oneLiner(t.id)} />
                    <a className="work-brief" href={`/t/${t.id}`} target="_blank" rel="noopener noreferrer">
                      read the full brief →
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      ) : null}
      {tasks.length ? (
        <p className="work-foot">
          Each is a verification we couldn&apos;t finish — no key, no compute, or a verifier that
          doesn&apos;t exist yet. Paste one into your agent; it does the work and opens a PR with your name on it.
        </p>
      ) : null}
      <div className="work-newprov">
        <h4>Verify a provider we don&apos;t list</h4>
        <p>
          Point the metric at any confidential-AI endpoint — a new one, or your own.
          CI re-checks the seal from your evidence, so a published verdict can&apos;t be faked.
        </p>
        <CopyLine text={auditLine} />
      </div>
    </>
  );
}
