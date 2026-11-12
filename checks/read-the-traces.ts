import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, isOk, safely, wordCount } from "./lib/files";
import { faultyIds, sampleIds } from "./lib/world";

const notesIn = (folder: string) => csvIn(folder, "notes.csv");

function hasTheRightColumns(folder: string): boolean {
  const notes = notesIn(folder);
  return notes.length > 0 && "trace_id" in notes[0] && "note" in notes[0];
}

function hasEachSampleDraftOnce(folder: string): boolean {
  const traceIds = notesIn(folder).map((note) => note.trace_id.toUpperCase());
  const sample = new Set(sampleIds());
  const eachOnce = new Set(traceIds).size === 30;
  return traceIds.length === 30 && eachOnce && traceIds.every((traceId) => sample.has(traceId));
}

function spottedMostFaultyDrafts(folder: string): boolean {
  const faulty = faultyIds("sample");
  const spotted = notesIn(folder).filter(
    (note) => faulty.has(note.trace_id.toUpperCase()) && !isOk(note.note),
  );
  return spotted.length >= Math.ceil(faulty.size * 0.75);
}

export default [
  {
    says: "notes.csv is in this folder",
    test: (folder) => hasFile(folder, "notes.csv"),
    tryNext: "click Download notes.csv in the viewer, then move the file into this problem folder",
  },
  {
    says: "notes.csv has the columns trace_id and note",
    test: (folder) => safely(() => hasTheRightColumns(folder)),
    tryNext: "keep the first row as it was: trace_id,note",
  },
  {
    says: "it has the 30 drafts from your sample, each one once",
    test: (folder) => safely(() => hasEachSampleDraftOnce(folder)),
    tryNext:
      "start again from the starter notes.csv, which lists your 30 drafts, " +
      "and do not add or remove rows",
  },
  {
    says: "every note is filled in: the word ok, or at least 6 words that say what you saw",
    test: (folder) =>
      safely(() => notesIn(folder).every((note) => isOk(note.note) || wordCount(note.note) >= 6)),
    tryNext:
      "find the empty or very short notes and write what you saw, " +
      "like: the museum is shut on the day it is booked",
  },
  {
    says: "you spotted most of the drafts with a real problem",
    test: (folder) => safely(() => spottedMostFaultyDrafts(folder)),
    tryNext:
      "open each draft you marked ok and check it against the request: " +
      "budget, closed days, walking, food and travel times",
  },
  {
    says: "you did not flag every draft: at least 5 notes say ok",
    test: (folder) => safely(() => notesIn(folder).filter((note) => isOk(note.note)).length >= 5),
    tryNext: "a note is for something a designer would fix; if a draft is fine, write ok",
  },
] satisfies Rule[];
