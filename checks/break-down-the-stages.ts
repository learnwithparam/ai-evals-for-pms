import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, safely, simplified, textIn } from "./lib/files";
import { planted, sampleIds, traces } from "./lib/world";
import { firstNumberIn, sameLineAfter } from "./set-launch-criteria";

// Draft Planner works in two stages. First it looks up places one at a time. Then it plans the
// trip from what it found. A fault in one place is a lookup fault. A fault that only shows when
// the places are put together is a plan fault.
const PLAN_MODES = new Set(["over-budget", "impossible-transfer", "wrong-pace"]);

// The main step uses five drafts. The other faults in the sample are for Go further.
const MAIN_IDS = ["T020", "T103", "T115", "T187", "T221"];

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
    const trace = byId.get(row.trace_id);
    const placed = trace?.draft.days.flatMap((day) => day.items) ?? [];
    const badPlace = placed.find((item) => row.detail.includes(item.name));
    const lookupIds = (trace?.lookups ?? []).map((look) => look.found);
    const step = lookupIds.indexOf(badPlace?.catalogue_id ?? "");
    key.set(row.trace_id, { stage: "lookup", step: step + 1 });
  }
  return key;
}

const rowsIn = (folder: string) => csvIn(folder, "stages.csv");
const stageOf = (row: Record<string, string>) => simplified(row.stage ?? "");

function everyFaultHasRow(folder: string): boolean {
  const rows = rowsIn(folder);
  const written = rows.map((row) => (row.trace_id ?? "").trim());
  const ids = new Set(written);
  return MAIN_IDS.every((id) => ids.has(id));
}

function stagesAreRight(folder: string): boolean {
  const key = truthKey();
  const rows = rowsIn(folder).filter((row) => key.has((row.trace_id ?? "").trim()));
  const right = rows.filter((row) => key.get(row.trace_id.trim())?.stage === stageOf(row));
  return rows.length >= MAIN_IDS.length && right.length / rows.length >= 0.85;
}

function lookupStepsAreRight(folder: string): boolean {
  const key = truthKey();
  const rows = rowsIn(folder);
  const listed = new Set(rows.map((row) => (row.trace_id ?? "").trim()));
  const wanted = [...key.entries()].filter(
    ([id, truth]) => truth.stage === "lookup" && listed.has(id),
  );
  const right = wanted.filter(([id, truth]) => {
    const row = rows.find((candidate) => (candidate.trace_id ?? "").trim() === id);
    return row !== undefined && Number(row.lookup_number) === truth.step;
  });
  return right.length / wanted.length >= 0.8;
}

function countsAreRight(folder: string): boolean {
  const text = textIn(folder, "breakdown.md");
  const key = truthKey();
  const listed = rowsIn(folder).map((row) => (row.trace_id ?? "").trim());
  const truths = listed.flatMap((id) => key.get(id) ?? []);
  const lookups = truths.filter((truth) => truth.stage === "lookup").length;
  const plans = truths.length - lookups;
  const saidLookups = firstNumberIn(sameLineAfter(text, "Lookup faults"));
  const saidPlans = firstNumberIn(sameLineAfter(text, "Plan faults"));
  return saidLookups === lookups && saidPlans === plans && searchCountsAreRight(folder);
}

// A search app has two stages too: the search brings back a page, then the answer uses it.
// The key comes from the columns in rag.csv: a wrong page is a search fault; a right page
// with an answer that does not match it is an answer fault.
function ragTruth(row: Record<string, string>): string {
  if (simplified(row.page_found ?? "") !== simplified(row.page_needed ?? "")) return "search";
  return simplified(row.answer_matches_page ?? "") === "no" ? "answer" : "none";
}

function ragStagesAreRight(folder: string): boolean {
  const rows = csvIn(folder, "rag.csv");
  return rows.length >= 6 && rows.every((row) => simplified(row.stage ?? "") === ragTruth(row));
}

function searchCountsAreRight(folder: string): boolean {
  const rows = csvIn(folder, "rag.csv");
  const text = textIn(folder, "breakdown.md");
  const searches = rows.filter((row) => ragTruth(row) === "search").length;
  const answers = rows.filter((row) => ragTruth(row) === "answer").length;
  const saidSearches = firstNumberIn(sameLineAfter(text, "Search faults"));
  const saidAnswers = firstNumberIn(sameLineAfter(text, "Answer faults"));
  return saidSearches === searches && saidAnswers === answers;
}

function nextFixIsNamed(folder: string): boolean {
  const line = simplified(sameLineAfter(textIn(folder, "breakdown.md"), "Fix first"));
  return /\b(lookup|plan)\b/.test(line) && line.split(" ").length >= 8;
}

export default [
  {
    says: "stages.csv has a row for each of the five drafts in the starter",
    test: (folder) => safely(() => hasFile(folder, "stages.csv") && everyFaultHasRow(folder)),
    tryNext: "the starter lists five draft ids; keep every row",
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
    says: "breakdown.md has Lookup, Plan, Search and Answer fault counts that match your rows",
    test: (folder) => safely(() => hasFile(folder, "breakdown.md") && countsAreRight(folder)),
    tryNext:
      "count the rows of stages.csv and of rag.csv for each stage and write all four numbers",
  },
  {
    says: "rag.csv marks each question as a search fault, an answer fault, or none",
    test: (folder) => safely(() => hasFile(folder, "rag.csv") && ragStagesAreRight(folder)),
    tryNext:
      "if page_found is not page_needed, write search; if the page is right but " +
      "answer_matches_page is no, write answer; otherwise write none",
  },
  {
    says: "a Fix first: line names a stage and says why in at least 8 words",
    test: (folder) => safely(() => nextFixIsNamed(folder)),
    tryNext: "write Fix first: lookup (or plan), then why that stage has more faults to fix",
  },
] satisfies Rule[];
