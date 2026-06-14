import type { Latest } from "@/lib/types";

export function Hero({ latest }: { latest: Latest | null }) {
  const s = latest?.summary;
  const tested = s ? s.with_reference : 0;

  // Nothing reproducible yet (no keys / no references): say so plainly,
  // never a fake 0% that reads as "everyone is honest".
  if (!s || tested === 0) {
    return (
      <section className="hero">
        <div className="kicker">Independent benchmark · verifiable inference</div>
        <h1 className="headline">
          <span className="hl-num">—</span> The verifiable-AI market is mapped below. None audited yet,
          awaiting keys to probe.
        </h1>
        <div className="substat">
          {s
            ? `${s.providers} real providers wired · ${s.skipped} awaiting an API key · cycle ${latest!.cycle}`
            : "no cycle has run yet"}
        </div>
      </section>
    );
  }

  const gap = s.trust_gap_pct;
  const matched = s.with_reference - s.deviating;
  const date = latest!.generated_at.replace("T", " ").slice(0, 16);

  return (
    <section className="hero">
      <div className="kicker">Independent benchmark · verifiable inference</div>
      <h1 className="headline">
        <span className="hl-num">{gap}%</span> of audited providers serve a model they never attested.
        <span className="info" title="Share of providers whose probed behaviour diverges from the model they attest, among those we hold a reference for.">ⓘ</span>
      </h1>

      <div className="meter">
        <div className="meter-bar">
          <div className="meter-fill" style={{ width: `${gap}%` }} />
          <div className="meter-tick" style={{ left: `${gap}%` }}>
            <span className="v">{gap}%</span>
          </div>
        </div>
        <div className="meter-ends">
          <span>0% · honest</span>
          <span>theatre · 100%</span>
        </div>
      </div>

      <div className="substat">
        {`${s.scored} providers audited · ${matched} served what they attest · ${s.deviating} did not · ${s.skipped} skipped · cycle ${latest!.cycle} · ${date}`}
      </div>
    </section>
  );
}
