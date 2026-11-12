import type { Rule } from "../scripts/verify";
import { csvIn, has, isOk, norm, safely, sections, textIn } from "./lib/files";

const tags = (s: string) =>
  s
    .split(/[;|]/)
    .map((x) => norm(x))
    .filter(Boolean);
const notes = (d: string) => csvIn(d, "notes.csv");
const counts = (d: string) => csvIn(d, "counts.csv");
const tally = (d: string) => {
  const t = new Map<string, number>();
  for (const r of notes(d))
    for (const m of tags(r.mode ?? "")) if (m !== "none") t.set(m, (t.get(m) ?? 0) + 1);
  return t;
};

export default [
  {
    says: "notes.csv in this folder has a mode column",
    test: (d) => safely(() => has(d, "notes.csv") && "mode" in notes(d)[0]),
    tryNext: "add a third column to notes.csv called mode, next to note",
  },
  {
    says: "every note that is not ok has a mode, or the word none if it is not a failure",
    test: (d) => safely(() => notes(d).every((r) => isOk(r.note) || tags(r.mode).length > 0)),
    tryNext: "filter notes.csv to rows that are not ok and fill in the mode cell on each one",
  },
  {
    says: "every mode you used is a heading in failure-modes.md",
    test: (d) =>
      safely(() => {
        const names = new Set(sections(textIn(d, "failure-modes.md")).map((s) => norm(s.title)));
        return [...tally(d).keys()].every((m) => names.has(m));
      }),
    tryNext:
      "copy each mode name from failure-modes.md exactly; a spelling change makes a new mode",
  },
  {
    says: "counts.csv has a mode column and a count column, one row for each mode you used",
    test: (d) =>
      safely(() => {
        const c = counts(d);
        const used = tally(d);
        return (
          c.length === used.size && c.every((r) => used.has(norm(r.mode)) && /^\d+$/.test(r.count))
        );
      }),
    tryNext:
      "make a pivot table from notes.csv: rows are mode, values are the count of trace_id; leave out none and empty",
  },
  {
    says: "each count matches the number of notes with that mode",
    test: (d) =>
      safely(() => {
        const t = tally(d);
        return counts(d).every((r) => t.get(norm(r.mode)) === Number(r.count));
      }),
    tryNext:
      "rebuild the pivot table from notes.csv so the numbers come from the notes, not from memory",
  },
  {
    says: "counts.csv runs from the biggest count to the smallest",
    test: (d) =>
      safely(() => {
        const n = counts(d).map((r) => Number(r.count));
        return n.every((v, i) => i === 0 || n[i - 1] >= v);
      }),
    tryNext: "sort counts.csv by the count column, largest first",
  },
  {
    says: "top-mode.md names the mode at the top of counts.csv and its count",
    test: (d) =>
      safely(() => {
        const top = counts(d)[0];
        const text = norm(textIn(d, "top-mode.md"));
        return (
          Boolean(top) &&
          text.includes(norm(top.mode)) &&
          new RegExp(`\\b${Number(top.count)}\\b`).test(text)
        );
      }),
    tryNext: "write one sentence like: The top failure mode is Closed on the day, with 4 drafts",
  },
] satisfies Rule[];
