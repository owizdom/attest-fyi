"use client";
import { useState } from "react";
import type { Task } from "@/lib/types";

const SITE = "https://attest.fyi";
const REPO_TASKS = "https://github.com/owizdom/attest-fyi/tree/main/tasks";

function oneLiner(id: string): string {
  return `Read ${SITE}/llms.txt, then complete ${SITE}/t/${id} — verify a confidential-AI provider for the attest.fyi benchmark and open a PR with the captured evidence.`;
}

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="task-copy"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? "copied ✓" : label}
    </button>
  );
}

export function Tasks({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return null;
  const master = `Read ${SITE}/llms.txt and help verify confidential AI: pick an open task at ${REPO_TASKS}, do the work, open a PR, and put your name on the register.`;
  return (
    <section className="tasks">
      <div className="reg-top">
        <h2>Open work</h2>
        <span className="label">{tasks.length} tasks · paste one into your agent</span>
      </div>
      <p className="tasks-lead">
        These are the verifications we couldn&apos;t finish — for lack of an API key, lack of compute to
        run a large model, or a verifier that doesn&apos;t exist yet. Hand one to your agent: it reads
        the brief, does the work, and opens a PR. Where it gets stuck, it records the next step and the
        task passes to whoever comes next. Every contributor&apos;s avatar lands on the verdict.
      </p>
      <div className="task-grid">
        {tasks.map((t) => (
          <div className={`task-card s-${t.status}`} key={t.id}>
            <div className="task-head">
              <a className="task-title" href={`/t/${t.id}`} target="_blank" rel="noopener noreferrer">
                {t.title}
              </a>
              <span className={`task-type ${t.type}`}>{t.type}</span>
            </div>
            <p className="task-sum">{t.summary}</p>
            <div className="task-meta">
              <span className={`task-status s-${t.status}`}>{t.status}</span>
              {t.blocked_on ? <span className="task-block">blocked: {t.blocked_on}</span> : null}
              {t.difficulty ? <span className="task-diff">{t.difficulty}</span> : null}
            </div>
            {t.contributors && t.contributors.length ? (
              <div className="task-vs">
                {t.contributors.slice(0, 6).map((c) => (
                  <img key={c} src={`https://github.com/${c}.png?size=40`} alt={c} title={c} loading="lazy" />
                ))}
              </div>
            ) : null}
            <Copy text={oneLiner(t.id)} label="copy for your agent" />
          </div>
        ))}
      </div>
      <div className="tasks-foot">
        <span>Or point your agent at the whole board.</span>
        <Copy text={master} label="copy board prompt" />
      </div>
    </section>
  );
}
