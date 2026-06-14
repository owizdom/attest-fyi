"use client";
import { useEffect, useState } from "react";
import type { ProviderRow } from "@/lib/types";
import { Seal } from "./Seal";

const VORDER: Record<string, number> = { fail: 0, unknown: 1, error: 1, partial: 2, skipped: 3, pass: 4 };
type Key = "name" | "score" | "delta" | "verdict";

function vclass(v: string): string {
  return ["pass", "fail", "partial", "skipped", "unknown"].includes(v) ? v : "unknown";
}

function scoreSub(p: ProviderRow): string {
  if (p.status === "skipped") return "no key";
  const id = p.identity;
  if (id && !id.no_reference && id.exact != null) return `exact ${id.exact} · sim ${id.sim}`;
  const a = p.attestation;
  if (a?.present && a?.signature_valid) return "tdx seal · dcap pending";
  if (a?.present) return `attest ${a.score}`;
  return "no reference";
}

function Delta({ d }: { d: number | null | undefined }) {
  if (d == null) return <span className="delta zero">—</span>;
  if (d === 0) return <span className="delta zero">0</span>;
  return <span className={`delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? `▲ +${d}` : `▼ ${d}`}</span>;
}

/* ---------- provider detail modal ---------- */
type CheckState = boolean | "pending";
function Check({ label, state }: { label: string; state: CheckState }) {
  const cls = state === true ? "yes" : state === false ? "no" : "pending";
  const mark = state === true ? "✓" : state === false ? "✗" : "○";
  return (
    <li>
      <span className={`mark ${cls}`}>{mark}</span>
      <span>{label}{state === "pending" ? " — pending" : ""}</span>
    </li>
  );
}

function ProviderDetail({ p, checked, onClose }: { p: ProviderRow; checked: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const a = p.attestation;
  const id = p.identity;
  const v = p.verdict || "unknown";
  const meas = a?.measurements;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal pm">
        <div className="modal-head">
          <h3>{p.displayName} <span className={`vd ${vclass(v)}`}>{v}</span></h3>
          <button className="modal-x" onClick={onClose} aria-label="close">✕</button>
        </div>
        <div className="modal-body">
          <div className="pm-section">
            <div className="pm-grid">
              <div><span className="k">Served model</span><span className="v">{p.served_model || "—"}</span></div>
              <div><span className="k">Claimed</span><span className="v">{p.attested_label || "—"}</span></div>
              <div><span className="k">Stack</span><span className="v">{(p.tags || []).join(" · ") || "—"}</span></div>
              <div><span className="k">Score</span><span className="v">{p.score == null ? "—" : p.score} / 100</span></div>
            </div>
          </div>

          {a?.present ? (
            <div className="pm-section">
              <h4>The seal — Intel TDX attestation</h4>
              <ul className="checks">
                <Check label="Attestation quote present" state={!!a.present} />
                <Check label="Genuine Intel TDX v4 quote (Intel QE vendor)" state={!!a.signature_valid} />
                <Check label="report_data binds the gateway signing key" state={!!a.channel_bound} />
                <Check label="Intel DCAP root chain + TCB status" state={a.root_trusted ? true : "pending"} />
                <Check label="Model binding (measurement → weights)" state={a.binds_model ? true : "pending"} />
              </ul>
              {a.signing_address && (
                <div className="pm-kv"><span className="k">Gateway key</span><span className="mono">{a.signing_address}</span></div>
              )}
              {meas && (
                <div className="pm-meas">
                  {(["mrtd", "rtmr0", "rtmr1", "rtmr2", "rtmr3"] as const).map((m) =>
                    meas[m] ? (
                      <div className="row" key={m}><span className="lbl">{m}</span><span className="val" title={meas[m]}>{meas[m].slice(0, 48)}…</span></div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ) : null}

          <div className="pm-section">
            <h4>Behaviour</h4>
            {p.status === "skipped" ? (
              <p className="pm-pending">Not tested this cycle. Awaiting an API key — drop it in <span className="mono">.env</span> and re-run.</p>
            ) : id && !id.no_reference && id.exact != null ? (
              <p className="pm-pending">
                exact-match {id.exact} · similarity {id.sim} vs the reference null {id.null_exact}.{" "}
                {id.detail}{id.confidence ? ` (confidence: ${id.confidence})` : ""}
              </p>
            ) : (
              <p className="pm-pending">{id?.detail || "no behavioural probe"}</p>
            )}
          </div>

          {a?.notes && a.notes.length ? (
            <div className="pm-section">
              <h4>Notes</h4>
              <ul className="notes">{a.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          ) : null}

          <div className="pm-section">
            <p className="pm-foot">Cycle checked {checked.replace("T", " ").slice(0, 16)}. Verify it yourself — see <b>Participate</b>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- register ---------- */
export function Register({ providers, checked }: { providers: ProviderRow[]; checked: string }) {
  const [key, setKey] = useState<Key>("score");
  const [dir, setDir] = useState(-1);
  const [sel, setSel] = useState<ProviderRow | null>(null);

  function sortBy(k: Key) {
    if (k === key) setDir(-dir);
    else { setKey(k); setDir(k === "name" ? 1 : -1); }
  }
  const val = (p: ProviderRow): number | string => {
    if (key === "name") return p.displayName.toLowerCase();
    if (key === "verdict") return VORDER[p.verdict] ?? 9;
    if (key === "delta") return p.delta == null ? -1e9 : p.delta;
    return p.score == null ? -1 : p.score;
  };
  const rows = [...providers].sort((a, b) => {
    const av = val(a) as never, bv = val(b) as never;
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  const head = (k: Key, label: string, extra = "") => (
    <button className={(key === k ? "sorted " : "") + extra} onClick={() => sortBy(k)}>
      {label}<span className="arrow">{key === k ? (dir > 0 ? "↑" : "↓") : "↕"}</span>
    </button>
  );

  return (
    <section className="register">
      <div className="reg-top">
        <h2>The register</h2>
        <span className="label">{providers.length} providers · click a row for proof</span>
      </div>

      <div className="reg-head">
        <span />
        {head("name", "Provider")}
        {head("score", "Score", "r")}
        <span className="col-delta">{head("delta", "Δ", "r")}</span>
        {head("verdict", "Verdict", "r")}
      </div>

      {rows.map((p) => (
        <div className="reg-row" key={p.id} onClick={() => setSel(p)} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setSel(p)}>
          <Seal verdict={vclass(p.verdict || "unknown")} />
          <div className="prov">{p.displayName}<small>{(p.tags || []).join(" · ")}</small></div>
          <div className="cell-r">
            <span className="score">{p.score == null ? "—" : p.score}<span className="sub">{scoreSub(p)}</span></span>
          </div>
          <div className="cell-r col-delta"><Delta d={p.delta} /></div>
          <div className="cell-r"><span className={`vd ${vclass(p.verdict || "unknown")}`}>{p.verdict}</span></div>
        </div>
      ))}

      {sel && <ProviderDetail p={sel} checked={checked} onClose={() => setSel(null)} />}
    </section>
  );
}
