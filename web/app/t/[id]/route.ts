import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-static";
export const dynamicParams = false;

// Pre-render one static markdown file per task at build time (the tasks/ dir is
// present then), so there's no runtime filesystem read on the serverless host.
export function generateStaticParams() {
  try {
    const idx = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "..", "tasks", "index.json"), "utf8"),
    ) as { tasks?: Array<{ id: string }> };
    return (idx.tasks ?? []).map((t) => ({ id: t.id }));
  } catch {
    return [];
  }
}

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
