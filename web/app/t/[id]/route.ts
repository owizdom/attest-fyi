import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

// Serves a task brief (tasks/<id>.md) as plain markdown, for agents to fetch.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9-]+$/.test(id)) {
    return new Response("bad task id", { status: 400 });
  }
  try {
    const md = fs.readFileSync(path.join(process.cwd(), "..", "tasks", `${id}.md`), "utf8");
    return new Response(md, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return new Response("task not found", { status: 404 });
  }
}
