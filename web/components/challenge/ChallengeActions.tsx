"use client";
import { useState } from "react";
import { Modal } from "../Modal";

// The challenge's own How it works / Participate.
//
// The top bar's versions (components/Actions.tsx) carry the same two labels but
// explain the provider-audit register: Fingerprint / Audit / Reproduce, and
// `attest.py verify`. On a benchmark page that is the wrong subject, so these
// are the benchmark's answers to the same two questions.

const REPO = "https://github.com/owizdom/attest-challenge";

const TIERS: [string, string][] = [
  ["A different model family", "solved"],
  ["A smaller model, 1B instead of 8B", "solved"],
  ["The same model, squeezed to save memory", "partly"],
  ["The same model, squeezed one notch", "unsolved"],
  ["A provider that answers honestly only when it senses a test", "unsolved"],
];

function HowItWorks() {
  return (
    <div className="how-body">
      <div className="how-grid">
        <div>
          <span className="how-k">What you write</span>
          <span className="how-v">
            Code that picks the questions to ask, and decides from the answers whether the model
            was swapped.
          </span>
        </div>
        <div>
          <span className="how-k">What you get</span>
          <span className="how-v">
            24 questions per provider, in two rounds. The second round sees the first
            round&apos;s answers.
          </span>
        </div>
        <div>
          <span className="how-k">How you score</span>
          <span className="how-v">
            22 providers to judge: 14 have been swapped, 8 are honest. Your score is the share of
            the 14 you catch.
          </span>
        </div>
        <div>
          <span className="how-k">How you lose</span>
          <span className="how-v">
            Accuse more than one honest provider and the run is thrown out. Flagging everyone
            scores zero.
          </span>
        </div>
      </div>

      <p className="how-h">The five kinds of swap</p>
      {TIERS.map(([what, status], i) => (
        <div className="ch-tier" key={i}>
          <span className="ch-tier-n">{i + 1}</span>
          <span className="ch-tier-w">{what}</span>
          <span className={`ch-tier-s ${status === "unsolved" ? "open" : ""}`}>{status}</span>
        </div>
      ))}
    </div>
  );
}

function Participate() {
  return (
    <div className="how-body">
      <pre className="code">{`yukon clone <setter>/attest-challenge
cd attest-challenge && yukon setup && yukon run`}</pre>

      <p className="how-foot">
        You edit <span className="ch-code">detector/</span> only: a probe generator and a decision
        function. Everything else is the harness.
      </p>
      <p className="how-foot">
        The answers are kept off your machine, so you cannot look them up, and the questions you
        are given depend on the code you submit, so you cannot prepare for them.
      </p>
      <p className="how-foot">
        <a href={REPO} target="_blank" rel="noopener noreferrer">Full brief and reference numbers →</a>
      </p>
    </div>
  );
}

export function ChallengeActions() {
  const [open, setOpen] = useState<null | "how" | "participate">(null);
  return (
    <>
      <button className="ch-pill" onClick={() => setOpen("how")}>How it works</button>
      <button className="ch-pill" onClick={() => setOpen("participate")}>Participate</button>

      {open === "how" && (
        <Modal title="How it works" onClose={() => setOpen(null)}><HowItWorks /></Modal>
      )}
      {open === "participate" && (
        <Modal title="Participate" onClose={() => setOpen(null)}><Participate /></Modal>
      )}
    </>
  );
}
