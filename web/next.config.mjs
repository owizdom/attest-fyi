import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pin the workspace root to this app (avoids multi-lockfile inference)
  turbopack: { root: __dirname },
};

export default nextConfig;
