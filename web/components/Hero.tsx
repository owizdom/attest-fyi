import type { Latest } from "@/lib/types";

export function Hero({ latest }: { latest: Latest | null }) {
  const s = latest?.summary;
  if (!s) {
    return (
      <section className="hero">
        <div className="kicker">Independent benchmark · verifiable inference</div>
        <h1 className="headline"><span className="hl-num">—</span> No cycle has run yet.</h1>
      </section>
    );
  }

  const tested = s.with_reference;
  const seals = s.seals_verified ?? 0;

  // Behavioural axis is live (we hold references): the trust-gap headline.
  if (tested > 0) {
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
            <div className="meter-tick" style={{ left: `${gap}%` }}><span className="v">{gap}%</span></div>
          </div>
          <div className="meter-ends"><span>0% · honest</span><span>theatre · 100%</span></div>
        </div>
        <div className="substat">
          {`${s.scored} providers audited · ${matched} served what they attest · ${s.deviating} did not · ${s.skipped} skipped · cycle ${latest!.cycle} · ${date}`}
        </div>
      </section>
    );
  }

  // Seals verified but no behavioural data yet (inference pending credit).
  if (seals > 0) {
    return (
      <section className="hero">
        <div className="kicker">Independent benchmark · verifiable inference</div>
        <h1 className="headline">
          <span className="hl-num">{seals}</span> provider {seals === 1 ? "seal" : "seals"} verified.
          The behavioural audit is pending inference credit.
          <span className="info" title="We fetched and structurally verified each provider's live Intel TDX quote (genuine quote, binds the gateway key). The Intel DCAP root chain, the model binding, and the behavioural probe are still pending.">ⓘ</span>
        </h1>
        <div className="substat">
          {`${seals} Intel TDX ${seals === 1 ? "quote" : "quotes"} fetched + structurally verified · ${s.skipped} awaiting an API key · cycle ${latest!.cycle}`}
        </div>
      </section>
    );
  }

  // Nothing reproducible yet.
  return (
    <section className="hero">
      <div className="kicker">Independent benchmark · verifiable inference</div>
      <h1 className="headline">
        <span className="hl-num">—</span> The verifiable-AI market is mapped below. None audited yet,
        awaiting keys to probe.
      </h1>
      <div className="substat">
        {`${s.providers} real providers wired · ${s.skipped} awaiting an API key · cycle ${latest!.cycle}`}
      </div>
    </section>
  );
}
