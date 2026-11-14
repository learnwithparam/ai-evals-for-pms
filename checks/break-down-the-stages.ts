import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, safely, simplified, textIn } from "./lib/files";
import { planted, sampleIds, traces } from "./lib/world";
import { firstNumberIn, sameLineAfter } from "./set-launch-criteria";

// Draft Planner works in two stages. First it looks up places one at a time. Then it plans the
// trip from what it found. A fault in one place is a lookup fault. A fault that only shows when
// the places are put together is a plan fault.
const PLAN_MODES = new Set(["over-budget", "impossible-transfer", "wrong-pace"]);

type Truth = { stage: "lookup" | "plan"; step: number };

// The answer key: for each real fault in the sample, its stage and the lookup that caused it.
function truthKey(): Map<string, Truth> {
  const sample = new Set(sampleIds());
  const byId = new Map(traces().map((trace) => [trace.trace_id, trace]));
  const key = new Map<string, Truth>();
  for (const row of planted()) {
    if (row.mode === "none" || !sample.has(row.trace_id)) continue;
    if (PLAN_MODES.has(row.mode)) {
      key.set(row.trace_id, { stage: "plan", step: 0 });
      continue;
    }
    const lookups = byId.get(row.trace_id)?.draft.days.flatMap((day) => day.items) ?? [];
    const lookupsFound = (byId.get(row.trace_id) as any)?.lookups as { found: string }[];
    const bad = lookups.findIndex((item) => row.detail.includes(item.name));
    const step = lookupsFound.findIndex((look) => look.found === lookups[bad]?.catalogue_id);
    key.set(row.trace_id, { stage: "lookup", step: step + 1 });
  }
  return key;
}

const rowsIn = (folder: string) => csvIn(folder, "stages.csv");
const stageOf = (row: Record<string, string>) => simplified(row.stage ?? "");

function everyFaultHasARow(folder: string): boolean {
  const ids = new Set(rowsIn(folder).map((row) => (row.trace_id ?? "").trim()));
  return [...truthKey().keys()].every((id) => ids.has(id));
}

function stagesAreRight(folder: string): boolean {
  const key = truthKey();
  const rows = rowsIn(folder).filter((row) => key.has((row.trace_id ?? "").trim()));
  const right = rows.filter((row) => key.get(row.trace_id.trim())?.stage === stageOf(row));
  return rows.length === key.size && right.length / key.size >= 0.85;
}

function lookupStepsAreRight(folder: string): boolean {
  const key = truthKey();
  const wanted = [...key.entries()].filter(([, truth]) => truth.stage === "lookup");
  const rows = rowsIn(folder);
  const right = wanted.filter(([id, truth]) => {
    const row = rows.find((candidate) => (candidate.trace_id ?? "").trim() === id);
    return row !== undefined && Number(row.lookup_number) === truth.step;
  });
  return right.length / wanted.length >= 0.8;
}

function countsAreRight(folder: string): boolean {
  const text = textIn(folder, "breakdown.md");
  const truths = [...truthKey().values()];
  const lookups = truths.filter((truth) => truth.stage === "lookup").length;
  const plans = truths.length - lookups;
  const saidLookups = firstNumberIn(sameLineAfter(text, "Lookup faults"));
  const saidPlans = firstNumberIn(sameLineAfter(text, "Plan faults"));
  return saidLookups === lookups && saidPlans === plans;
}

function nextFixIsNamed(folder: string): boolean {
  const line = simplified(sameLineAfter(textIn(folder, "breakdown.md"), "Fix first"));
  return /\b(lookup|plan)\b/.test(line) && line.split(" ").length >= 8;
}

export default [
  {
    says: "stages.csv has a row for every real fault in your sample of 30",
    test: (folder) => safely(() => hasFile(folder, "stages.csv") && everyFaultHasARow(folder)),
    tryNext: "the starter lists the 13 draft ids that have a real fault; keep every row",
  },
  {
    says: "each fault is marked lookup or plan, and at least 85% are right",
    test: (folder) => safely(() => stagesAreRight(folder)),
    tryNext:
      "ask: is one place wrong by itself (lookup), or are the places fine but the mix breaks " +
      "the budget, the pace or the travel time (plan)?",
  },
  {
    says: "each lookup fault names the number of the lookup that went wrong",
    test: (folder) => safely(() => lookupStepsAreRight(folder)),
    tryNext:
      "open the draft in the viewer, find the place named in the fault, and count which " +
      "lookup returned it, starting at 1",
  },
  {
    says: "breakdown.md has Lookup faults: and Plan faults: counts that match your rows",
    test: (folder) => safely(() => hasFile(folder, "breakdown.md") && countsAreRight(folder)),
    tryNext: "count the rows of stages.csv for each stage and write both numbers",
  },
  {
    says: "a Fix first: line names a stage and says why in at least 8 words",
    test: (folder) => safely(() => nextFixIsNamed(folder)),
    tryNext: "write Fix first: lookup (or plan), then why that stage has more faults to fix",
  },
] satisfies Rule[];
