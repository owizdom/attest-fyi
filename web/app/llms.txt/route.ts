import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

// Serves the repo-root llms.txt — the base brief an agent reads first.
export async function GET() {
  try {
    const txt = fs.readFileSync(path.join(process.cwd(), "..", "llms.txt"), "utf8");
    return new Response(txt, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new Response("llms.txt not found", { status: 404 });
  }
}
