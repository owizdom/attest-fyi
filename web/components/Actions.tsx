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
    ["Fingerprint", "The same probes run at temperature 0 against each provider. A swapped, distilled, or quantised engine diverges from the model it claims; the same model repeats itself, so any drift is real signal."],
    ["Audit", "The attestation quote and image digest are verified, then weighed against what actually came out. A valid seal wrapped around the wrong engine is the headline fault."],
    ["Reproduce", "Every probe set and transcript is content-hashed. Re-run the harness yourself and you land on the same verdict. Blind spots are published, not hidden."],
  ];
  const verdicts: [string, string, string][] = [
    ["pass", "Pass", "The attestation verifies and the model behind it matches what was attested. The seal holds — a fully pressed wax stamp."],
    ["partial", "Partial", "The served model matches its claim, but the seal does not fully prove it: either the attestation is valid yet does not bind the weights, or there is no attestation at all. Right model, not fully proven."],
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

function SubmitForm() {
  const [msg, setMsg] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((x) => x.json());
      setMsg(r.ok ? "Queued. We'll probe it next cycle." : r.error || "error");
      if (r.ok) form.reset();
    } catch {
      setMsg("Could not reach the server.");
    }
  }
  const fields: [string, string, boolean][] = [
    ["name", "Acme Confidential AI", true],
    ["endpoint", "https://api.acme.ai/v1", true],
    ["model", "llama-3.3-70b-instruct", true],
    ["attested_model", "llama-3.3-70b-instruct (if different)", false],
    ["tee", "intel-tdx · nvidia-cc · none", false],
    ["contact", "you@domain", false],
  ];
  const labels: Record<string, string> = {
    name: "Provider name", endpoint: "API base URL", model: "Model served / requested",
    attested_model: "Attested model", tee: "TEE / attestation type", contact: "Contact",
  };
  return (
    <form className="form" onSubmit={onSubmit}>
      {fields.map(([n, ph, req]) => (
        <label key={n}>{labels[n]}<input name={n} placeholder={ph} required={req} /></label>
      ))}
      <button className="submit" type="submit">Queue for testing</button>
      <div className="form-msg">{msg}</div>
    </form>
  );
}

function Participate() {
  return (
    <div className="participate">
      <p className="lead">Don&apos;t take our word for it. The whole point is that you don&apos;t have to.</p>
      <p>
        The harness is open and every verdict reproduces. The numbers on this page are not a claim you
        are asked to trust. They are a thing you can re-run.
      </p>
      <h4 className="part-h">Verify a verdict yourself</h4>
      <pre className="code">{`# clone the benchmark
git clone https://github.com/owizdom/attest-fail
cd attest-fail

# build a reference from a model you trust as ground truth
python3 attest.py build-ref --adapter ollama \\
  --model llama3.2:1b-instruct-q8_0

# drop provider keys in .env, then run a cycle
python3 attest.py run`}</pre>
      <p>
        You land on the same verdict we publish. Every probe and transcript is content-hashed, so you
        can check ours against yours, line by line. No login, no permission asked. That is the point.
      </p>
      <h4 className="part-h">Add a provider to the board</h4>
      <p className="part-sub">
        Know a confidential-inference endpoint that should be tested? Queue it and it gets probed next cycle.
      </p>
      <SubmitForm />
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
        attest.fail does not break that gate. It takes back the one thing they cannot ration: the
        truth of what you were served. When you cannot choose the model, you can at least prove you
        got the one you were promised. And it gives the open, ungated, verifiable providers a way to
        prove they are honest, which is the only road that runs around the gatekeepers. That is how a
        little power comes back to the people using these systems instead of the few rationing them.
        attest.fail does not trust the seal. It checks.
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
