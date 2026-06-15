import type { Metadata } from "next";
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
