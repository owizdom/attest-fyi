"use client";
import { useEffect, useState } from "react";
import { Seal } from "./Seal";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-x" onClick={onClose} aria-label="close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps: [string, string][] = [
    ["Fingerprint", "The same probes run at temperature 0 against each provider. A swapped or smaller model diverges from the one it claims; a quantised copy of the right model still binds — identity is what's certified, not precision. On a labelled calibration set the binding flags 0% of quantised models as swaps and catches 100% of real swaps (run `attest.py calibrate` to reproduce)."],
    ["Audit", "The attestation quote and image digest are verified, then weighed against what actually came out. A valid seal wrapped around the wrong engine is the headline fault."],
    ["Reproduce", "Each run samples an unpredictable subset of a public probe pool, keyed by a fresh nonce it then publishes — so a provider can't serve the real model only for a known test set, and anyone can reproduce exactly which probes ran. Every transcript is content-hashed; re-run the harness and you land on the same verdict."],
  ];
  const verdicts: [string, string, string][] = [
    ["pass", "Pass", "The attestation verifies and the model behind it matches what was attested. The seal holds — a fully pressed wax stamp."],
    ["partial", "Partial", "Incomplete proof. Either the served model matches its claim but the seal does not fully bind it, or the Intel TDX seal is verified while the behavioural probe is still pending (e.g. inference needs credit). A real signal, not a full one."],
    ["fail", "Fail", "The behaviour diverges from the model claimed — a different, smaller, or quantised engine is being served. The seal is broken, regardless of any quote."],
    ["skipped", "Skipped / Unknown", "Not tested this cycle (missing credentials), or there is no reference to judge identity against and no verifiable attestation to lean on. No seal pressed yet."],
  ];
  return (
    <>
      {steps.map(([h, p], i) => (
        <div className="step" key={i}>
          <span className="num">{i + 1}</span>
          <div><h4>{h}</h4><p>{p}</p></div>
        </div>
      ))}

      <div className="verdicts">
        <h4 className="verdicts-title">The verdicts</h4>
        <p className="verdicts-intro">Every audited provider earns one of these. The mark on each register row is its seal.</p>
        {verdicts.map(([key, label, desc]) => (
          <div className="verdict-row" key={key}>
            <Seal verdict={key} />
            <p><b className={key}>{label}</b> — {desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Participate() {
  return (
    <div className="participate">
      <p className="lead">
        Don&apos;t take our word for it. Every verdict here reproduces, and you can put your name on the
        ones you check.
      </p>

      <h4 className="part-h">Sign a verdict</h4>
      <p className="part-sub">
        Open any provider, read the proof, and hit <b>Verify &amp; add your name</b>. It opens a GitHub
        issue from your account; a bot reads your handle — no one can sign as you — and adds your avatar
        to that verdict. The verifier list lives in the repo, one commit per signer: auditable, not a
        number we control.
      </p>

      <h4 className="part-h">Verify a provider</h4>
      <p className="part-sub">
        Point the metric at any confidential-AI endpoint — a new one, or your own. Paste this into your
        agent; it audits the provider and opens a PR, and CI re-verifies the seal before it can land.
      </p>
      <pre className="code">{`Read https://attest.fyi/llms.txt, then audit a confidential-AI provider for the attest.fyi board: write the manifest, run "python3 attest.py audit <id>" with your key, and open a PR titled "verify: <id>".`}</pre>

      <h4 className="part-h">Reproduce it yourself</h4>
      <p className="part-sub">
        Clone it and re-run. No keys needed to re-check the seals; add provider keys for the full
        behavioural verdict.
      </p>
      <pre className="code">{`git clone https://github.com/owizdom/attest-fyi
cd attest-fyi
python3 -m venv .venv && .venv/bin/pip install cryptography

# re-verify every published seal from the evidence — offline, no keys
.venv/bin/python attest.py verify

# or run the whole benchmark with your provider keys in .env
.venv/bin/python attest.py run`}</pre>
      <p>
        You land on the same verdict we publish. Every probe and transcript is content-hashed, so you
        can check ours against yours, line by line.
      </p>
    </div>
  );
}

function Thesis() {
  return (
    <div className="thesis">
      <p className="lead">Verifiable AI is arriving. Almost no one checks whether the proof holds.</p>
      <p>
        Confidential inference and hardware attestation are being built so a provider can prove the
        model that answered you is the one it promised. And a provider can hold a perfectly valid
        attestation while quietly serving a smaller or quantised engine behind it.{" "}
        <strong>The seal is real. The model is not.</strong> Nobody sells you that gap, so this measures it.
      </p>
      <p>
        I spent a good while inside the verifiable-compute world, much of it on the projects coming
        out of Eigen Labs: EigenCompute, EigenDA, EigenAI. They convinced me of one plain thing.
        Computation is starting to come with a receipt. What was missing was anyone independent to
        audit the receipts. So I built that.
      </p>
      <p>
        You can already see the shape of it. The strongest models now ship in{" "}
        <a href="https://www.anthropic.com/news/claude-fable-5-mythos-5" target="_blank" rel="noopener noreferrer">two grades</a>:
        a public one with the brakes on, and a quieter one, brakes off, for a short list of vetted
        organizations. Then a government asked, and public access to the top tier was switched off
        overnight, foreign nationals first. You are given what you are given, and you get no say. A
        few houses and a few states are deciding which intelligence the rest of us are allowed to touch.
      </p>
      <p>
        attest.fyi does not break that gate. It takes back the one thing they cannot ration: the
        truth of what you were served. When you cannot choose the model, you can at least prove you
        got the one you were promised. And it gives the open, ungated, verifiable providers a way to
        prove they are honest, which is the only road that runs around the gatekeepers. That is how a
        little power comes back to the people using these systems instead of the few rationing them.
        attest.fyi does not trust the seal. It checks.
      </p>
      <p className="sign"><span className="sign-seal">✦</span> Built by Wisdom. Inspired by Eigen Labs. Built for the future, as the future comes.</p>
    </div>
  );
}

export function Actions() {
  const [open, setOpen] = useState<null | "thesis" | "how" | "participate">(null);
  return (
    <>
      <button onClick={() => setOpen("thesis")}>Thesis</button>
      <button onClick={() => setOpen("how")}>How it works</button>
      <button onClick={() => setOpen("participate")}>Participate</button>
      {open === "thesis" && <Modal title="Thesis" onClose={() => setOpen(null)}><Thesis /></Modal>}
      {open === "how" && <Modal title="How it works" onClose={() => setOpen(null)}><HowItWorks /></Modal>}
      {open === "participate" && <Modal title="Participate" onClose={() => setOpen(null)}><Participate /></Modal>}
    </>
  );
}
