import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, safely } from "./lib/files";
import { dataCsv } from "./lib/world";

const NEEDED_COLUMNS = ["trace_id", "label", "comment"];
const ASSIGNMENT_FOLDER = join(import.meta.dir, "..", "assignment");
const SPREADSHEET_FOLDER = join(
  import.meta.dir,
  "..",
  "parts",
  "02-define-good",
  "02-label-the-golden-set",
  "problem",
);

// The learner works in assignment/, so the untouched starter of this step is that folder.
// A solution or a wrong answer is read where it sits.
export function workFolder(folder: string): string {
  const isStarter = basename(folder) === "problem" && folder.includes("label-the-queue-rows");
  return isStarter ? ASSIGNMENT_FOLDER : folder;
}

const exportIn = (folder: string) => csvIn(workFolder(folder), "scores-export.csv");
const goldenIds = () => dataCsv("golden-set.csv").map((row) => row.trace_id);
const labelOf = (row: Record<string, string>) => (row.label ?? "").toLowerCase();

function hasTheColumns(folder: string): boolean {
  const firstRow = exportIn(folder)[0];
  return NEEDED_COLUMNS.every((column) => column in firstRow);
}

// Exactly the 40 golden ids, each once, each with pass or fail.
function everyRowHasOneLabel(folder: string): boolean {
  const rows = exportIn(folder);
  const ids = rows.map((row) => row.trace_id.toUpperCase());
  const eachIdOnce = new Set(ids).size === ids.length;
  const sameIds = goldenIds().every((id) => ids.includes(id));
  const everyLabelIsPassOrFail = rows.every((row) => ["pass", "fail"].includes(labelOf(row)));
  return eachIdOnce && sameIds && ids.length === goldenIds().length && everyLabelIsPassOrFail;
}

export function passRate(rows: Record<string, string>[]): number {
  const passes = rows.filter((row) => labelOf(row) === "pass").length;
  return rows.length === 0 ? 0 : passes / rows.length;
}

// The spreadsheet from label-the-golden-set: a labels.csv beside the export, or the learner's own.
export function spreadsheetRows(folder: string): Record<string, string>[] {
  const here = workFolder(folder);
  const source = hasFile(here, "labels.csv") ? here : SPREADSHEET_FOLDER;
  return csvIn(source, "labels.csv");
}

// The ids whose label in the queue differs from the label in the spreadsheet.
export function changedLabels(folder: string): string[] {
  const spreadsheet = new Map(spreadsheetRows(folder).map((row) => [row.trace_id, labelOf(row)]));
  const changed = exportIn(folder).filter((row) => spreadsheet.get(row.trace_id) !== labelOf(row));
  return changed.map((row) => row.trace_id);
}

export function exportRows(folder: string): Record<string, string>[] {
  return exportIn(folder);
}

export function toolVersion(folder: string): string {
  const here = workFolder(folder);
  if (!hasFile(here, "langfuse-version.txt")) return "unknown";
  return readFileSync(join(here, "langfuse-version.txt"), "utf8").trim();
}

export default [
  {
    says: "the export file scores-export.csv is in assignment/ with trace_id, label and comment",
    test: (folder) =>
      safely(() => hasFile(workFolder(folder), "scores-export.csv") && hasTheColumns(folder)),
    tryNext: "run bun run export-scores after you label the queue; it writes the file for you",
  },
  {
    says: "every row has one label: 40 drafts, each once, each pass or fail",
    test: (folder) => safely(() => everyRowHasOneLabel(folder)),
    tryNext: "open the queue in Langfuse, label every draft once, then run the export again",
  },
] satisfies Rule[];
