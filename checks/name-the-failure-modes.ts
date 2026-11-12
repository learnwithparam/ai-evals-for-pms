import type { Rule } from "../scripts/verify";
import {
  csvIn,
  field,
  hasFile,
  isOk,
  safely,
  sections,
  simplified,
  textIn,
  traceIdsIn,
  wordCount,
} from "./lib/files";

// Words that say how a draft felt, not what went wrong. A mode named only with these is too vague.
const VAGUE_WORDS = new Set([
  "quality",
  "helpfulness",
  "helpful",
  "accuracy",
  "accurate",
  "inaccurate",
  "relevance",
  "relevant",
  "coherence",
  "tone",
  "bad",
  "poor",
  "wrong",
  "error",
  "errors",
  "issue",
  "issues",
  "problem",
  "problems",
  "other",
  "misc",
  "general",
  "mistake",
  "mistakes",
  "hallucination",
  "hallucinations",
  "the",
  "a",
  "an",
  "low",
  "draft",
  "drafts",
  "output",
  "plan",
  "itinerary",
]);

const failureModesIn = (folder: string) => sections(textIn(folder, "failure-modes.md"));
const tracesListedUnder = (mode: { body: string }) => traceIdsIn(field(mode.body, "Traces"));

// The drafts whose note says something went wrong.
function flaggedTraceIds(folder: string): Set<string> {
  const notes = csvIn(folder, "notes.csv");
  const flaggedNotes = notes.filter((note) => !isOk(note.note));
  return new Set(flaggedNotes.map((note) => note.trace_id.toUpperCase()));
}

function hasFourToEightModes(folder: string): boolean {
  const modeCount = failureModesIn(folder).length;
  return modeCount >= 4 && modeCount <= 8;
}

function everyListedDraftIsFlagged(folder: string): boolean {
  const flagged = flaggedTraceIds(folder);
  const isFlagged = (traceId: string) => flagged.has(traceId);
  return failureModesIn(folder).every((mode) => tracesListedUnder(mode).every(isFlagged));
}

function nameSaysWhatHappened(title: string): boolean {
  const words = simplified(title).split(" ");
  return words.some((word) => word && !VAGUE_WORDS.has(word));
}

function modesCoverMostFlaggedNotes(folder: string): boolean {
  const flagged = flaggedTraceIds(folder);
  const covered = new Set(failureModesIn(folder).flatMap(tracesListedUnder));
  const coveredFlagged = [...flagged].filter((traceId) => covered.has(traceId));
  return flagged.size > 0 && coveredFlagged.length / flagged.size >= 0.8;
}

export default [
  {
    says: "notes.csv from the last step is in this folder",
    test: (folder) =>
      safely(() => hasFile(folder, "notes.csv") && "note" in csvIn(folder, "notes.csv")[0]),
    tryNext:
      "the starter has a notes.csv; put it back, " +
      "or copy in your own notes.csv from read-the-traces",
  },
  {
    says: "failure-modes.md is in this folder",
    test: (folder) => hasFile(folder, "failure-modes.md"),
    tryNext: "open failure-modes.md in this problem folder and fill it in",
  },
  {
    says: "it names 4 to 8 failure modes, each under its own ## heading",
    test: (folder) => safely(() => hasFourToEightModes(folder)),
    tryNext:
      "group notes that describe the same problem; " +
      "merge groups with one note, split a group that mixes two problems",
  },
  {
    says: "every mode has a Definition: line of at least 6 words",
    test: (folder) =>
      safely(() =>
        failureModesIn(folder).every((mode) => wordCount(field(mode.body, "Definition")) >= 6),
      ),
    tryNext:
      "under each heading write Definition: and one sentence a designer could use to spot it",
  },
  {
    says: "every mode lists at least 2 drafts on its Traces: line",
    test: (folder) =>
      safely(() =>
        failureModesIn(folder).every((mode) => new Set(tracesListedUnder(mode)).size >= 2),
      ),
    tryNext: "add the ids of at least two drafts, like Traces: T020, T199",
  },
  {
    says: "every draft you list has a note that is not ok",
    test: (folder) => safely(() => everyListedDraftIsFlagged(folder)),
    tryNext:
      "check each id against notes.csv; only list drafts where your note says what went wrong",
  },
  {
    says: "no mode is named with only a vague word like quality or accuracy",
    test: (folder) =>
      safely(() => failureModesIn(folder).every((mode) => nameSaysWhatHappened(mode.title))),
    tryNext: "name what happened, like Closed on the day, not what it felt like, like Quality",
  },
  {
    says: "together the modes cover at least 8 in 10 of your notes that are not ok",
    test: (folder) => safely(() => modesCoverMostFlaggedNotes(folder)),
    tryNext: "find the flagged notes no mode lists yet, and add each one to the mode it fits",
  },
] satisfies Rule[];
