import type { Rule } from "../scripts/verify";
import { hasFile, safely, sections, simplified, textIn } from "./lib/files";

const NEEDED_COLUMNS = ["mode", "metric", "threshold", "measured on", "critical", "owner"];

// Words in a learner's mode name, and the world's name for that mode in world/data/releases/.
const WORLD_MODE_WORDS: [RegExp, string][] = [
  [/mobility|step|wheelchair|walking/, "ignores-mobility"],
  [/closed/, "closed-on-the-day"],
  [/budget|cost|price/, "over-budget"],
  [/travel|transfer|far apart|distance/, "impossible-transfer"],
  [/diet|food|vegetarian|vegan/, "diet-missed"],
  [/pace|busy|too many/, "wrong-pace"],
  [/season/, "out-of-season"],
  [/catalogue|does not exist|made up|invented/, "not-in-catalogue"],
];

export type Criterion = Record<string, string>;

// The world's name for a learner's mode, like "Ignores mobility needs" to "ignores-mobility".
export function worldModeFor(modeName: string): string | undefined {
  const name = simplified(modeName);
  const match = WORLD_MODE_WORDS.find(([words]) => words.test(name));
  return match ? match[1] : undefined;
}

function cellsOf(line: string): string[] {
  const inside = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inside.split("|").map((cell) => cell.trim());
}

// The rows of the first Markdown table in launch-criteria.md, keyed by lower-case column names.
export function criteriaIn(folder: string): Criterion[] {
  const lines = textIn(folder, "launch-criteria.md").split("\n");
  const tableLines = lines.filter((line) => line.trim().startsWith("|"));
  const [headerLine, , ...rowLines] = tableLines;
  const columns = cellsOf(headerLine).map((column) => simplified(column));
  return rowLines.map((line) => {
    const cells = cellsOf(line);
    return Object.fromEntries(columns.map((column, i) => [column, cells[i] ?? ""]));
  });
}

export const firstNumberIn = (text: string) =>
  Number.parseFloat(text.match(/\d+(\.\d+)?/)?.[0] ?? "");

// The text after "Label:" on the same line. An empty label never reads the line below it.
export function sameLineAfter(text: string, label: string): string {
  const labelLine = new RegExp(`^[ \\t]*[-*]?[ \\t]*\\**${label}\\**[ \\t]*:[ \\t]*(.*)$`, "im");
  const match = text.match(labelLine);
  return match ? match[1].trim() : "";
}

export const isCritical = (row: Criterion) => simplified(row.critical) === "yes";

export function failureModeNames(folder: string): string[] {
  return sections(textIn(folder, "failure-modes.md")).map((section) => section.title);
}

function hasTheColumns(folder: string): boolean {
  const rows = criteriaIn(folder);
  return rows.length > 0 && NEEDED_COLUMNS.every((column) => column in rows[0]);
}

function everyModeHasRow(folder: string): boolean {
  const rowModes = criteriaIn(folder).map((row) => simplified(row.mode));
  const modes = failureModeNames(folder).map((name) => simplified(name));
  return modes.length > 0 && modes.every((mode) => rowModes.includes(mode));
}

function criticalIsYesOrNo(folder: string): boolean {
  const rows = criteriaIn(folder);
  const yesOrNo = rows.every((row) => ["yes", "no"].includes(simplified(row.critical)));
  return yesOrNo && rows.some(isCritical);
}

export default [
  {
    says: "launch-criteria.md has a table: Mode, Metric, Threshold, Measured on, Critical, Owner",
    test: (folder) => safely(() => hasFile(folder, "launch-criteria.md") && hasTheColumns(folder)),
    tryNext: "keep the header row of the starter table and add one row under it for each mode",
  },
  {
    says: "every mode in failure-modes.md has a row, spelled the same",
    test: (folder) => safely(() => everyModeHasRow(folder)),
    tryNext: "copy each ## heading of failure-modes.md into the Mode column, word for word",
  },
  {
    says: "every mode is one the release results measure",
    test: (folder) => safely(() => criteriaIn(folder).every((row) => worldModeFor(row.mode))),
    tryNext:
      "name each mode by what happened, like Ignores mobility needs or Over budget, " +
      "so it matches a column in world/data/releases/summary.csv",
  },
  {
    says: "every Threshold is a number, like at most 1",
    test: (folder) =>
      safely(() => criteriaIn(folder).every((row) => !Number.isNaN(firstNumberIn(row.threshold)))),
    tryNext: "replace words like low or rare with a number: at most 1 fail, or at most 2%",
  },
  {
    says: "every Measured on names a set of 30 drafts or more",
    test: (folder) =>
      safely(() => criteriaIn(folder).every((row) => firstNumberIn(row["measured on"]) >= 30)),
    tryNext:
      "a set under 30 is too small to trust; write the set and its size, like release set, 150",
  },
  {
    says: "Critical is yes or no on every row, and at least one row says yes",
    test: (folder) => safely(() => criticalIsYesOrNo(folder)),
    tryNext: "mark the mode that would hurt a traveller most as critical: yes",
  },
  {
    says: "every row names an Owner",
    test: (folder) =>
      safely(() => criteriaIn(folder).every((row) => simplified(row.owner).length >= 2)),
    tryNext: "write who fixes each mode when it fails, like Ines Duarte or the engineering lead",
  },
] satisfies Rule[];
