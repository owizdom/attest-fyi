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

  // Behavioural axis is live (we hold references): lead with the gap that
  // actually matters — how many providers you can't verify the model for.
  if (tested > 0) {
    const verified = s.model_verified ?? Math.max(0, s.with_reference - s.deviating);
    const unverified = s.model_unverified ?? Math.max(0, s.scored - verified);
    const unvPct = s.model_unverified_pct ?? (s.scored ? Math.round((100 * unverified) / s.scored) : 0);
    const date = latest!.generated_at.replace("T", " ").slice(0, 16);
    return (
      <section className="hero">
        <div className="kicker">Independent benchmark · verifiable inference</div>
        <h1 className="headline">
          <span className="hl-num">{unvPct}%</span> of audited providers can&apos;t prove which model you were served.
          <span className="info" title="Share of audited providers whose model identity is unverifiable: the seal does not bind the weights and no reference exists to check behaviour, so a swapped or quantised model would be invisible. Separately, none of the providers we could check were caught serving a wrong model.">ⓘ</span>
        </h1>
        <div className="meter">
          <div className="meter-bar">
            <div className="meter-fill" style={{ width: `${unvPct}%` }} />
            <div className="meter-tick" style={{ left: `${unvPct}%` }}><span className="v">{unvPct}%</span></div>
          </div>
          <div className="meter-ends"><span>0% · model checkable</span><span>blind trust · 100%</span></div>
        </div>
        <div className="substat">
          {`${s.scored} audited · ${verified} let you verify the model · ${unverified} you can't · ${s.deviating} caught serving a wrong model · cycle ${latest!.cycle} · ${date}`}
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
