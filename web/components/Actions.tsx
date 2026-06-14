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

export function Actions() {
  const [open, setOpen] = useState<null | "how" | "submit">(null);
  return (
    <>
      <button onClick={() => setOpen("how")}>How it works</button>
      <button onClick={() => setOpen("submit")}>Submit</button>
      {open === "how" && <Modal title="How it works" onClose={() => setOpen(null)}><HowItWorks /></Modal>}
      {open === "submit" && <Modal title="Submit an endpoint" onClose={() => setOpen(null)}><SubmitForm /></Modal>}
    </>
  );
}
