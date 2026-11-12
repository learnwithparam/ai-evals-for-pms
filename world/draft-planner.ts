// Draft Planner: the AI feature the learner owns. It reads a customer request and the supplier
// catalogue and writes a day-by-day draft for a trip designer. In replay mode it returns the draft
// it wrote before.
// bun run draft <request-id>
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { complete } from "../config/llm";
import { draftText, requestText } from "./format";
import type { Item, Trace } from "./generate";
import { catalogue, LOGS, traces } from "./world";

const INSTRUCTIONS = [
  "You are Draft Planner at Lantern Trails, a custom tour company in Portugal.",
  "Write a day-by-day draft for the request below. Use only places from the catalogue.",
  "Each line: time, place name, price. End with the total per person.",
];

// Every area the draft visits, so the prompt shows only the catalogue rows that matter.
function areasInDraft(trace: Trace): Set<string> {
  const itemAreas = trace.draft.days.flatMap((day) => day.items.map((item) => item.area));
  return new Set([trace.draft.hotel.area, ...itemAreas]);
}

function catalogueLine(place: Item): string {
  const cells = [
    place.id,
    place.name,
    place.type,
    `closed ${place.closed_day || "never"}`,
    place.season,
    place.access,
    place.food || "-",
    `${place.price_eur} euros`,
  ];
  return cells.join(" | ");
}

function promptFor(trace: Trace): string {
  const areas = areasInDraft(trace);
  const nearbyPlaces = catalogue().filter((place) => areas.has(place.area));
  const catalogueLines = nearbyPlaces.map(catalogueLine);
  const parts = [...INSTRUCTIONS, "", requestText(trace), "", "Catalogue:", ...catalogueLines];
  return parts.join("\n");
}

export async function runDraft(requestId: string) {
  const wantedId = requestId.toUpperCase();
  const trace = traces().find((candidate) => candidate.request_id === wantedId);
  if (!trace) throw new Error(`There is no request called "${requestId}". Try R001 to R300.`);

  const reply = await complete("smart", promptFor(trace), draftText(trace));
  const run = {
    run_id: crypto.randomUUID(),
    at: new Date().toISOString(),
    request_id: trace.request_id,
    trace_id: trace.trace_id,
    provider: reply.provider,
    role: reply.role,
    draft_lines: reply.text.split("\n").length,
  };
  mkdirSync(LOGS, { recursive: true });
  appendFileSync(join(LOGS, "runs.jsonl"), `${JSON.stringify(run)}\n`);
  return { trace, text: reply.text, run };
}

async function printDraft(requestId: string) {
  const { trace, text, run } = await runDraft(requestId);
  console.log(requestText(trace));
  console.log("");
  console.log(text);
  console.log("");
  console.log(
    `Draft Planner wrote a draft for ${trace.request_id} (provider: ${run.provider}). ` +
      "Logged to world/logs/runs.jsonl.",
  );
}

if (import.meta.main) {
  try {
    await printDraft(process.argv[2] ?? "R001");
  } catch (error) {
    console.log((error as Error).message);
    process.exit(1);
  }
}
