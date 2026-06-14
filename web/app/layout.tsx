import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "attest.fail — is verifiable AI actually verifiable?",
  description:
    "An independent benchmark that checks whether confidential-inference providers serve the model they attest.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
