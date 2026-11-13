import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, isOk, safely, sections, simplified, textIn } from "./lib/files";

// A note may carry more than one mode, split by ; or |, like "Closed on the day; Over budget".
function modesInCell(cell: string): string[] {
  const pieces = cell.split(/[;|]/);
  const modes = pieces.map((piece) => simplified(piece));
  return modes.filter(Boolean);
}

const notesIn = (folder: string) => csvIn(folder, "notes.csv");
const countsIn = (folder: string) => csvIn(folder, "counts.csv");

// How many notes use each mode, counted from notes.csv itself. "none" is not a failure.
function modeTally(folder: string): Map<string, number> {
  const tally = new Map<string, number>();
  for (const note of notesIn(folder)) {
    for (const mode of modesInCell(note.mode ?? "")) {
      if (mode !== "none") tally.set(mode, (tally.get(mode) ?? 0) + 1);
    }
  }
  return tally;
}

function usedModesAreHeadings(folder: string): boolean {
  const headings = sections(textIn(folder, "failure-modes.md"));
  const modeNames = new Set(headings.map((heading) => simplified(heading.title)));
  const usedModes = [...modeTally(folder).keys()];
  return usedModes.every((mode) => modeNames.has(mode));
}

function oneCountRowPerUsedMode(folder: string): boolean {
  const countRows = countsIn(folder);
  const usedModes = modeTally(folder);
  const isValidRow = (row: Record<string, string>) =>
    usedModes.has(simplified(row.mode)) && /^\d+$/.test(row.count);
  return countRows.length === usedModes.size && countRows.every(isValidRow);
}

function countsMatchTheNotes(folder: string): boolean {
  const tally = modeTally(folder);
  return countsIn(folder).every((row) => tally.get(simplified(row.mode)) === Number(row.count));
}

function countsAreSortedBiggestFirst(folder: string): boolean {
  const counts = countsIn(folder).map((row) => Number(row.count));
  return counts.every((count, i) => i === 0 || counts[i - 1] >= count);
}

function topModeIsNamed(folder: string): boolean {
  const topRow = countsIn(folder)[0];
  if (!topRow) return false;
  const text = simplified(textIn(folder, "top-mode.md"));
  const topCount = new RegExp(`\\b${Number(topRow.count)}\\b`);
  return text.includes(simplified(topRow.mode)) && topCount.test(text);
}

export default [
  {
    says: "notes.csv in this folder has a mode column",
    test: (folder) => safely(() => hasFile(folder, "notes.csv") && "mode" in notesIn(folder)[0]),
    tryNext: "add a third column to notes.csv called mode, next to note",
  },
  {
    says: "every note that is not ok has a mode, or the word none if it is not a failure",
    test: (folder) =>
      safely(() =>
        notesIn(folder).every((note) => isOk(note.note) || modesInCell(note.mode).length > 0),
      ),
    tryNext: "filter notes.csv to rows that are not ok and fill in the mode cell on each one",
  },
  {
    says: "every mode you used is a heading in failure-modes.md",
    test: (folder) => safely(() => usedModesAreHeadings(folder)),
    tryNext:
      "copy each mode name from failure-modes.md exactly; a spelling change makes a new mode",
  },
  {
    says: "counts.csv has a mode column and a count column, one row for each mode you used",
    test: (folder) => safely(() => oneCountRowPerUsedMode(folder)),
    tryNext:
      "make a pivot table from notes.csv: rows are mode, values are the count of trace_id; " +
      "leave out none and empty",
  },
  {
    says: "each count matches the number of notes with that mode",
    test: (folder) => safely(() => countsMatchTheNotes(folder)),
    tryNext:
      "rebuild the pivot table from notes.csv so the numbers come from the notes, not from memory",
  },
  {
    says: "counts.csv runs from the biggest count to the smallest",
    test: (folder) => safely(() => countsAreSortedBiggestFirst(folder)),
    tryNext: "sort counts.csv by the count column, largest first",
  },
  {
    says: "top-mode.md names the mode at the top of counts.csv and its count",
    test: (folder) => safely(() => topModeIsNamed(folder)),
    tryNext:
      "use the first row of counts.csv in one sentence, " +
      "like: The top failure mode is Over budget, with 5 drafts out of 30",
  },
] satisfies Rule[];
