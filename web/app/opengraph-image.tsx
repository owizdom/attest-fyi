import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = "attest.fyi — is verifiable AI actually verifiable?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card (auto-wired as og:image / twitter:image).
//
// Satori resolves no stylesheets, no custom properties and no currentColor, so
// this has to hold real values. They come from lib/brand.ts, which is the twin
// of the :root block in globals.css, rather than from a second private copy of
// the palette like before.
//
// The font is deliberately left as a generic stack: Satori cannot load the
// variable woff2 the site uses, so matching it would mean installing the static
// package purely as a build-time asset source, and getting that wrong is a
// silent build failure for a 1200x630 png.
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
          background: BRAND.bg,
          color: BRAND.ink,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: BRAND.accent, fontFamily: "monospace" }}>
          Independent benchmark
        </div>
        <div style={{ fontSize: 118, fontWeight: 700, marginTop: 12, display: "flex" }}>
          attest<span style={{ color: BRAND.accent }}>.</span>fyi
        </div>
        <div style={{ fontSize: 48, marginTop: 14, maxWidth: 980, lineHeight: 1.25 }}>
          Is verifiable AI actually verifiable?
        </div>
        <div style={{ fontSize: 27, marginTop: 30, color: BRAND.inkDim, maxWidth: 940 }}>
          Checks whether confidential-inference providers serve the model they attest. Every verdict reproduces.
        </div>
      </div>
    ),
    { ...size },
  );
}
