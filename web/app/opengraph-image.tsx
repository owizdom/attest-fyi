import { ImageResponse } from "next/og";

export const alt = "attest.fyi — is verifiable AI actually verifiable?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card (auto-wired as og:image / twitter:image).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "84px",
          background: "#ECE6D3",
          color: "#1b1714",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: "#7c2018", fontFamily: "monospace" }}>
          Independent benchmark
        </div>
        <div style={{ fontSize: 118, fontWeight: 700, marginTop: 12, display: "flex" }}>
          attest<span style={{ color: "#7c2018" }}>.</span>fyi
        </div>
        <div style={{ fontSize: 48, marginTop: 14, maxWidth: 980, lineHeight: 1.25 }}>
          Is verifiable AI actually verifiable?
        </div>
        <div style={{ fontSize: 27, marginTop: 30, color: "#5a534a", maxWidth: 940 }}>
          Checks whether confidential-inference providers serve the model they attest. Every verdict reproduces.
        </div>
      </div>
    ),
    { ...size },
  );
}
