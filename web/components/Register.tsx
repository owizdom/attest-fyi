"use client";
import { useEffect, useState } from "react";
import type { ProviderRow, Verifier } from "@/lib/types";
import { Seal } from "./Seal";

const REPO = "owizdom/attest-fyi";

function signUrl(id: string, name: string): string {
  const title = encodeURIComponent(`verify: ${id}`);
  const body = encodeURIComponent(
    `I re-ran the attest.fyi check for ${name} and it reproduced. Add me to the register.\n\n` +
      `Leave the title as "verify: ${id}" — the workflow reads it, and your GitHub handle is taken ` +
      `from this issue automatically (no one can sign as you).`
  );
  return `https://github.com/${REPO}/issues/new?title=${title}&body=${body}&labels=verify`;
}

function VerifierWall({ vs }: { vs?: Verifier[] }) {
  if (!vs || vs.length === 0) return null;
  return (
    <span className="vwall" title={vs.map((v) => "@" + v.login).join(", ")}>
      {vs.slice(0, 5).map((v) => (
        <img key={v.login} className="vface" src={`https://github.com/${v.login}.png?size=40`} alt={v.login} loading="lazy" />
      ))}
      <em>{vs.length === 1 ? "1 verifier" : `${vs.length} verifiers`}</em>
    </span>
  );
}

const VORDER: Record<string, number> = { fail: 0, unknown: 1, error: 1, partial: 2, skipped: 3, pass: 4 };
type Key = "name" | "score" | "delta" | "verdict";

function vclass(v: string): string {
  return ["pass", "fail", "partial", "skipped", "unknown"].includes(v) ? v : "unknown";
}

function scoreSub(p: ProviderRow): string {
  if (p.status === "skipped") return p.reason || "no key";
  const id = p.identity;
  if (id && !id.no_reference && id.exact != null) return `exact ${id.exact} · sim ${id.sim}`;
  const a = p.attestation;
  if (a?.present && a?.root_trusted) {
    const gpu = a.gpu_arch ? ` + ${a.gpu_arch.toLowerCase()}` : "";
    return `intel-rooted${gpu} seal · tcb ${a.tcb_status === "UpToDate" ? "ok" : (a.tcb_status || "?")}`;
  }
  if (a?.present && a?.signature_valid) return "tdx seal · dcap pending";
  if (a?.present) return `attest ${a.score}`;
  if (p.verdict === "unknown") return "no verifiable seal";
  return "no reference";
}

function bindReason(a: { notes?: string[] }): string {
  const n = (a.notes || []).find((x) => x.toLowerCase().startsWith("model binding:"));
  return n ? n.replace(/^model binding:\s*/i, "") : "the weights load outside the measured boundary.";
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
  const vs = p.verifiers ?? [];

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
              <h4>The seal — {a.vendor?.includes("nvidia") ? "Intel TDX CPU + NVIDIA GPU confidential computing" : "Intel TDX attestation"}</h4>
              <ul className="checks">
                <Check label="Attestation quote present" state={!!a.present} />
                <Check label="Genuine Intel TDX v4 quote (Intel QE vendor)" state={!!a.signature_valid} />
                {a.fleet_size ? (
                  <Check label={`Verified across all ${a.fleet_size} nodes serving this model`} state={!!a.root_trusted} />
                ) : null}
                <Check label="DCAP signature chain → Intel SGX Root CA" state={!!a.root_trusted} />
                <Check label={`CPU TCB status: ${a.tcb_status || "unknown"}`} state={a.tcb_status === "UpToDate"} />
                {a.gpu_arch ? (
                  <Check label={`NVIDIA ${a.gpu_arch}${a.gpu_die ? ` (${a.gpu_die})` : ""} GPU cert chain → NVIDIA Device Identity CA`} state={!!a.gpu_root_trusted} />
                ) : null}
                <Check label={a.vendor?.includes("nvidia") ? "report_data binds the enclave session key (E2E)" : "report_data binds the gateway signing key"} state={!!a.channel_bound} />
                <Check label="Model bound by measurement (weights in the quote)" state={!!a.binds_model} />
                {id?.binding === "behavioural" && (
                  <Check label="Model verified by behaviour (vs trusted weights + decoy)" state={!!id.bound} />
                )}
              </ul>

              <div className="pm-binding">
                {a.vendor?.includes("nvidia") ? (
                  <p><b>What this seal proves:</b> {a.fleet_size ? `all ${a.fleet_size} nodes serving this model run` : "the node runs"} a genuine Intel TDX enclave{a.root_trusted ? ", rooted in Intel’s SGX Root CA," : ","} each paired with {a.gpu_arch ? `an NVIDIA ${a.gpu_arch}${a.gpu_die ? ` (${a.gpu_die})` : ""}` : "an NVIDIA"} GPU whose certificate chains to NVIDIA’s Device Identity CA{a.tcb_status ? ` (TCB ${a.tcb_status})` : ""}. The prompt stayed inside that boundary.</p>
                ) : (
                  <p><b>What this seal proves:</b> a genuine Intel TDX enclave{a.root_trusted ? ", rooted in Intel’s SGX Root CA" : ""}{a.tcb_status ? ` (TCB ${a.tcb_status})` : ""} ran the gateway, and the prompt stayed inside it.</p>
                )}
                {id?.bound ? (
                  <p><b>Model verified:</b> the served model behaviourally matches the claimed open weights{id.sim_trusted != null ? ` (similarity ${id.sim_trusted}${id.sim_decoy != null ? `, vs ${id.sim_decoy} for a decoy model` : ""})` : ""} — it is the model claimed, not a swap. Identity is verified against weights we ran ourselves; exact precision (quantisation) is not certified.</p>
                ) : (
                  <p><b>What it does not prove:</b> which model&apos;s weights answered. {bindReason(a)}</p>
                )}
                {p.pitch && <p className="pm-claim"><b>{p.displayName} claims:</b> {p.pitch}</p>}
              </div>
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
              <p className="pm-pending">
                {p.reason === "awaiting credit"
                  ? "Key is valid, but the account balance is $0. Fund it and re-run for the behavioural verdict."
                  : <>Not tested this cycle. Awaiting an API key — drop it in <span className="mono">.env</span> and re-run.</>}
              </p>
            ) : id && !id.no_reference && id.exact != null ? (
              <p className="pm-pending">
                exact-match {id.exact} · similarity {id.sim} vs the reference null {id.null_exact}.{" "}
                {id.detail}{id.confidence ? ` (confidence: ${id.confidence})` : ""}
              </p>
            ) : (
              <p className="pm-pending">{id?.detail || "no behavioural probe"}</p>
            )}
          </div>

          {p.findings && p.findings.length ? (
            <div className="pm-section">
              <h4>Findings</h4>
              <div className="pm-findings">
                {p.findings.map((f, i) => <p key={i}>{f}</p>)}
              </div>
            </div>
          ) : null}

          <div className="pm-section">
            <h4>Verified by{vs.length ? ` ${vs.length}` : ""}</h4>
            {vs.length > 0 ? (
              <div className="vlist">
                {vs.map((vf) => (
                  <a key={vf.login} className="vchip" href={`https://github.com/${vf.login}`} target="_blank" rel="noopener noreferrer" title={`${vf.mode || "witness"}${vf.at ? " · " + vf.at : ""}`}>
                    <img src={`https://github.com/${vf.login}.png?size=48`} alt={vf.login} loading="lazy" />
                    <span>@{vf.login}</span>
                    {vf.mode && vf.mode !== "witness" ? <em className={`vmode ${vf.mode}`}>{vf.mode}</em> : null}
                  </a>
                ))}
              </div>
            ) : (
              <p className="pm-pending">No one has signed this verdict yet. Be the first.</p>
            )}
            <p className="vnote">Re-run the check, then put your name on it. Signing opens a GitHub issue from your account; a bot reads your handle (it can&apos;t be faked) and appends you to this register.</p>
            <a className="vsign" href={signUrl(p.id, p.displayName)} target="_blank" rel="noopener noreferrer">Verify &amp; add your name →</a>
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
          <div className="prov">{p.displayName}<small>{(p.tags || []).join(" · ")}</small><VerifierWall vs={p.verifiers} /></div>
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
