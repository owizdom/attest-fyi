import type { Metadata } from "next";
// Self-hosted, OFL-1.1. Zalando Sans is one of the faces Yukon's own stylesheet
// declares; their primary, ABC Repro, is commercial and cannot ship here.
// The family names carry a "Variable" suffix and globals.css must use it
// verbatim, or the page silently falls back to system sans and looks almost
// right. Imported before globals.css so the stylesheet wins any cascade tie.
import "@fontsource-variable/zalando-sans-expanded";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

const TITLE = "attest.fyi — is verifiable AI actually verifiable?";
const DESC =
  "An independent benchmark that checks whether confidential-inference providers serve the model they attest.";

export const metadata: Metadata = {
  metadataBase: new URL("https://attest.fyi"),
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: "https://attest.fyi", siteName: "attest.fyi", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
