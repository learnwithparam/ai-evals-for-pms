// Draft Planner: the AI feature the learner owns. It reads a customer request and the supplier catalogue
// and writes a day-by-day draft for a trip designer. In replay mode it returns the draft it wrote before.
// bun run draft <request-id>
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { complete } from "../config/llm";
import { draftText, requestText } from "./format";
import { catalogue, LOGS, traces } from "./world";

export async function runDraft(requestId: string) {
  const t = traces().find((x) => x.request_id === requestId.toUpperCase());
  if (!t) throw new Error(`There is no request called "${requestId}". Try R001 to R300.`);
  const areas = new Set([
    t.draft.hotel.area,
    ...t.draft.days.flatMap((d) => d.items.map((i) => i.area)),
  ]);
  const rows = catalogue()
    .filter((c) => areas.has(c.area))
    .map(
      (c) =>
        `${c.id} | ${c.name} | ${c.type} | closed ${c.closed_day || "never"} | ${c.season} | ${c.access} | ${c.food || "-"} | ${c.price_eur} euros`,
    );
  const prompt = [
    "You are Draft Planner at Lantern Trails, a custom tour company in Portugal.",
    "Write a day-by-day draft for the request below. Use only places from the catalogue.",
    "Each line: time, place name, price. End with the total per person.",
    "",
    requestText(t),
    "",
    "Catalogue:",
    ...rows,
  ].join("\n");
  const reply = await complete("smart", prompt, draftText(t));
  const run = {
    run_id: crypto.randomUUID(),
    at: new Date().toISOString(),
    request_id: t.request_id,
    trace_id: t.trace_id,
    provider: reply.provider,
    role: reply.role,
    draft_lines: reply.text.split("\n").length,
  };
  mkdirSync(LOGS, { recursive: true });
  appendFileSync(join(LOGS, "runs.jsonl"), JSON.stringify(run) + "\n");
  return { trace: t, text: reply.text, run };
}

if (import.meta.main) {
  const id = process.argv[2] ?? "R001";
  try {
    const { trace, text, run } = await runDraft(id);
    console.log(requestText(trace));
    console.log("");
    console.log(text);
    console.log("");
    console.log(
      `Draft Planner wrote a draft for ${trace.request_id} (provider: ${run.provider}). Logged to world/logs/runs.jsonl.`,
    );
  } catch (e) {
    console.log((e as Error).message);
    process.exit(1);
  }
}
