// Collapsed by default, like Yukon's "How it works" button. Plain words only:
// no "gate", no "negatives", no "held-out corpus".

const TIERS = [
  ["A different model family", "solved"],
  ["A smaller model, 1B instead of 8B", "solved"],
  ["The same model, squeezed to save memory", "partly"],
  ["The same model, squeezed one notch", "unsolved"],
  ["A provider that answers honestly only when it senses a test", "unsolved"],
];

export function Scoring() {
  return (
    <details id="how" className="how">
      <summary>How it works</summary>

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
              24 questions per provider, in two rounds. The second round sees the first round&apos;s
              answers.
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
        <div className="how-tiers">
          {TIERS.map(([what, status], i) => (
            <div className="ch-tier" key={i}>
              <span className="ch-tier-n">{i + 1}</span>
              <span className="ch-tier-w">{what}</span>
              <span className={`ch-tier-s ${status === "unsolved" ? "open" : ""}`}>{status}</span>
            </div>
          ))}
        </div>

        <p className="how-h">Try it</p>
        <pre className="code">{`yukon clone <setter>/attest-challenge
cd attest-challenge && yukon setup && yukon run`}</pre>
        <p className="how-foot">
          The answers are kept off your machine, so you cannot look them up, and the questions you
          are given depend on the code you submit, so you cannot prepare for them.{" "}
          <a href="https://github.com/owizdom/attest-challenge" target="_blank" rel="noopener noreferrer">
            Full brief →
          </a>
        </p>
      </div>
    </details>
  );
}
