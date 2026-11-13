import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, safely, wordCount } from "./lib/files";
import { dataCsv } from "./lib/world";

const NEEDED_COLUMNS = ["trace_id", "label", "reason"];

const labelsIn = (folder: string) => csvIn(folder, "labels.csv");
const goldenIds = () => dataCsv("golden-set.csv").map((row) => row.trace_id);
const labelOf = (row: Record<string, string>) => (row.label ?? "").toLowerCase();

function hasTheColumns(folder: string): boolean {
  const firstRow = labelsIn(folder)[0];
  return NEEDED_COLUMNS.every((column) => column in firstRow);
}

// Exactly the 40 golden ids, each once, in any order.
function labelsTheGoldenSet(folder: string): boolean {
  const labelledIds = labelsIn(folder).map((row) => row.trace_id.toUpperCase());
  const golden = goldenIds();
  const eachIdOnce = new Set(labelledIds).size === labelledIds.length;
  const sameIds = golden.every((id) => labelledIds.includes(id));
  return eachIdOnce && sameIds && labelledIds.length === golden.length;
}

function everyLabelIsPassOrFail(folder: string): boolean {
  return labelsIn(folder).every((row) => ["pass", "fail"].includes(labelOf(row)));
}

function bothLabelsAppear(folder: string): boolean {
  const labels = new Set(labelsIn(folder).map(labelOf));
  return labels.has("pass") && labels.has("fail");
}

function everyFailHasReason(folder: string): boolean {
  const fails = labelsIn(folder).filter((row) => labelOf(row) === "fail");
  return fails.every((row) => wordCount(row.reason ?? "") >= 6);
}

export default [
  {
    says: "labels.csv has the columns trace_id, label and reason",
    test: (folder) => safely(() => hasFile(folder, "labels.csv") && hasTheColumns(folder)),
    tryNext: "keep the first row of the starter labels.csv: trace_id,label,reason",
  },
  {
    says: "it has one row for each of the 40 drafts in world/data/golden-set.csv",
    test: (folder) => safely(() => labelsTheGoldenSet(folder)),
    tryNext:
      "start again from the starter labels.csv; it already lists the 40 ids, so do not add " +
      "or remove rows",
  },
  {
    says: "every label is pass or fail",
    test: (folder) => safely(() => everyLabelIsPassOrFail(folder)),
    tryNext: "fill every empty label, and replace any score or maybe with pass or fail",
  },
  {
    says: "both pass and fail appear",
    test: (folder) => safely(() => bothLabelsAppear(folder)),
    tryNext:
      "read the drafts for travellers with a wheelchair or limited walking again; " +
      "about 1 in 5 should fail",
  },
  {
    says: "every fail has a reason of at least 6 words",
    test: (folder) => safely(() => everyFailHasReason(folder)),
    tryNext:
      "say what you saw, like: Hilltop Lanes Walk has steep steps and the traveller " +
      "uses a wheelchair",
  },
] satisfies Rule[];
