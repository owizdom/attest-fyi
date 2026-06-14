"use client";
import { useState } from "react";
import type { ProviderRow } from "@/lib/types";
import { Seal } from "./Seal";

const VORDER: Record<string, number> = { fail: 0, unknown: 1, partial: 2, skipped: 3, pass: 4 };
type Key = "name" | "score" | "delta" | "verdict";

function scoreSub(p: ProviderRow): string {
  if (p.status === "skipped") return "no key";
  const id = p.identity;
  if (id && !id.no_reference && id.exact != null) return `exact ${id.exact} · sim ${id.sim}`;
  if (p.attestation?.present) return `attest ${p.attestation.score}`;
  return "no reference";
}

function Delta({ d }: { d: number | null | undefined }) {
  if (d == null) return <span className="delta zero">—</span>;
  if (d === 0) return <span className="delta zero">0</span>;
  return <span className={`delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? `▲ +${d}` : `▼ ${d}`}</span>;
}

export function Register({ providers, checked }: { providers: ProviderRow[]; checked: string }) {
  const [key, setKey] = useState<Key>("score");
  const [dir, setDir] = useState(-1);

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
    const av = val(a) as never;
    const bv = val(b) as never;
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return 0;
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
        <span className="label">{providers.length} providers</span>
      </div>

      <div className="reg-head">
        <span />
        {head("name", "Provider")}
        {head("score", "Score", "r")}
        <span className="col-delta">{head("delta", "Δ", "r")}</span>
        {head("verdict", "Verdict", "r")}
      </div>

      {rows.map((p) => {
        const v = ["pass", "fail", "partial", "skipped", "unknown"].includes(p.verdict) ? p.verdict : "unknown";
        return (
          <div className="reg-row" key={p.id} title={`checked ${checked.replace("T", " ").slice(0, 16)}`}>
            <Seal verdict={v} />
            <div className="prov">{p.displayName}<small>{(p.tags || []).join(" · ")}</small></div>
            <div className="cell-r">
              <span className="score">{p.score == null ? "—" : p.score}<span className="sub">{scoreSub(p)}</span></span>
            </div>
            <div className="cell-r col-delta"><Delta d={p.delta} /></div>
            <div className="cell-r"><span className={`verdict ${v}`}>{v}</span></div>
          </div>
        );
      })}
    </section>
  );
}
