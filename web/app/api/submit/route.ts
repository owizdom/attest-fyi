import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!data.endpoint || !data.name) {
    return NextResponse.json({ error: "name and endpoint are required" }, { status: 400 });
  }
  const dir = path.join(process.cwd(), "..", "submissions");
  fs.mkdirSync(dir, { recursive: true });
  data.received_at = new Date().toISOString();
  const ts = String(data.received_at).replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(dir, `submission-${ts}.json`), JSON.stringify(data, null, 2));
  return NextResponse.json({ ok: true, message: "endpoint queued for testing" });
}
