import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, isOk, safely, sections, simplified, textIn, wordCount } from "./lib/files";
import { sameLineAfter } from "./set-launch-criteria";

const REQUIRED_RUBRIC_HEADINGS = ["pass", "fail", "borderline rule", "examples"];

// Words that say how a trace felt, not what went wrong. A mode named only with these is too vague.
const VAGUE_WORDS = new Set([
  "quality",
  "helpful",
  "helpfulness",
  "accuracy",
  "accurate",
  "inaccurate",
  "relevance",
  "relevant",
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
  "hallucination",
  "hallucinations",
  "answer",
  "output",
  "the",
  "a",
  "an",
]);

const ownFolder = (folder: string) => join(folder, "own");
const notesIn = (folder: string) => csvIn(ownFolder(folder), "notes.csv");
const modesIn = (folder: string) => sections(textIn(ownFolder(folder), "failure-modes.md"));
const idKey = (id: string) => simplified(id);

function flaggedIds(folder: string): Set<string> {
  const flagged = notesIn(folder).filter((row) => !isOk(row.note));
  return new Set(flagged.map((row) => idKey(row.trace_id)));
}

// The ids on a mode's Traces: line, split by commas.
function tracesListedUnder(body: string): string[] {
  const listed = sameLineAfter(body, "Traces").split(/[,;]/);
  return listed.map(idKey).filter(Boolean);
}

function twentyNotes(folder: string): boolean {
  const notes = notesIn(folder);
  const ids = notes.map((row) => idKey(row.trace_id ?? ""));
  const everyIdFilled = ids.every(Boolean);
  return notes.length === 20 && everyIdFilled && new Set(ids).size === 20;
}

function okAndFlaggedBothAppear(folder: string): boolean {
  const okCount = notesIn(folder).filter((row) => isOk(row.note)).length;
  return okCount >= 2 && flaggedIds(folder).size >= 8;
}

function listedTracesAreFlagged(folder: string): boolean {
  const flagged = flaggedIds(folder);
  return modesIn(folder).every((mode) => {
    const listed = new Set(tracesListedUnder(mode.body));
    return listed.size >= 2 && [...listed].every((id) => flagged.has(id));
  });
}

function nameSaysWhatHappened(title: string): boolean {
  const words = simplified(title).split(" ");
  return words.some((word) => word && !VAGUE_WORDS.has(word));
}

function modesCoverMostFlagged(folder: string): boolean {
  const flagged = flaggedIds(folder);
  const covered = new Set(modesIn(folder).flatMap((mode) => tracesListedUnder(mode.body)));
  const coveredFlagged = [...flagged].filter((id) => covered.has(id));
  return flagged.size > 0 && coveredFlagged.length / flagged.size >= 0.8;
}

const rubricText = (folder: string) => textIn(ownFolder(folder), "rubric.md");
const judgeText = (folder: string) => textIn(ownFolder(folder), "judge.md");

function bodyUnder(markdown: string, heading: string): string {
  const found = sections(markdown).find((section) => simplified(section.title) === heading);
  return found ? found.body : "";
}

function rubricHasHeadings(folder: string): boolean {
  const titles = sections(rubricText(folder)).map((section) => simplified(section.title));
  return REQUIRED_RUBRIC_HEADINGS.every((heading) => titles.includes(heading));
}

// Example ids must be traces the learner wrote a note on: ok ones pass, the others fail.
function rubricExamplesUseOwnNotes(folder: string): boolean {
  const examples = bodyUnder(rubricText(folder), "examples");
  const passIds = sameLineAfter(examples, "Pass").split(/[,;]/).map(idKey).filter(Boolean);
  const failIds = sameLineAfter(examples, "Fail").split(/[,;]/).map(idKey).filter(Boolean);
  const flagged = flaggedIds(folder);
  const allIds = new Set(notesIn(folder).map((row) => idKey(row.trace_id)));
  const passesAreOk = passIds.every((id) => allIds.has(id) && !flagged.has(id));
  const failsAreFlagged = failIds.every((id) => flagged.has(id));
  return passIds.length >= 1 && failIds.length >= 1 && passesAreOk && failsAreFlagged;
}

function checkedByIsChosen(folder: string): boolean {
  const line = sameLineAfter(rubricText(folder), "Checked by");
  const choice = simplified(line)
    .split(" ")[0]
    ?.replace(/[^a-z]/g, "");
  return (choice === "code" || choice === "judge") && wordCount(line) >= 10;
}

// The judge prompt holds the rubric's Pass and Fail text word for word.
function judgeHoldsRubric(folder: string): boolean {
  const judge = simplified(judgeText(folder));
  const passText = simplified(bodyUnder(rubricText(folder), "pass"));
  const failText = simplified(bodyUnder(rubricText(folder), "fail"));
  return passText !== "" && failText !== "" && judge.includes(passText) && judge.includes(failText);
}

function judgeAsksForReasonFirst(folder: string): boolean {
  const output = simplified(bodyUnder(judgeText(folder), "output"));
  const critique = output.indexOf("critique");
  const verdict = output.indexOf("verdict");
  return critique >= 0 && verdict > critique;
}

// Your own ids are short codes like F01, not the course's T001.
function idsLike(text: string): string[] {
  return (text.match(/\b[A-Za-z]{1,3}\d{1,4}\b/g) ?? []).map(idKey);
}

function judgeExamplesAreOwn(folder: string): boolean {
  const ids = new Set(idsLike(bodyUnder(judgeText(folder), "examples")));
  const known = new Set(notesIn(folder).map((row) => idKey(row.trace_id)));
  return ids.size >= 2 && ids.size <= 4 && [...ids].every((id) => known.has(id));
}

export default [
  {
    says: "own/notes.csv has 20 rows, each with its own trace_id and a note",
    test: (folder) => safely(() => hasFile(ownFolder(folder), "notes.csv") && twentyNotes(folder)),
    tryNext: "pick 20 of your own traces; give each a short id like F01 in the trace_id column",
  },
  {
    says: "every note is ok or has at least 6 words",
    test: (folder) =>
      safely(() => notesIn(folder).every((row) => isOk(row.note) || wordCount(row.note) >= 6)),
    tryNext: "write what you saw in a full sentence, or the single word ok",
  },
  {
    says: "at least 2 notes are ok and at least 8 are not",
    test: (folder) => safely(() => okAndFlaggedBothAppear(folder)),
    tryNext:
      "read more slowly, or pick traces your users complained about; " +
      "a sample with almost no failures teaches little",
  },
  {
    says: "own/failure-modes.md names 4 to 8 modes, each under its own ## heading",
    test: (folder) =>
      safely(() => {
        const count = modesIn(folder).length;
        return count >= 4 && count <= 8;
      }),
    tryNext: "group the notes that are not ok by what went wrong; aim for 4 to 8 groups",
  },
  {
    says: "every mode has a Definition: line of at least 6 words",
    test: (folder) =>
      safely(() =>
        modesIn(folder).every((mode) => wordCount(sameLineAfter(mode.body, "Definition")) >= 6),
      ),
    tryNext: "under each heading, write Definition: and one sentence someone else could apply",
  },
  {
    says: "every mode lists 2 or more traces, each with a note that is not ok",
    test: (folder) => safely(() => listedTracesAreFlagged(folder)),
    tryNext: "on each Traces: line, list ids from own/notes.csv whose note says what went wrong",
  },
  {
    says: "no mode is named with only a vague word like quality or accuracy",
    test: (folder) =>
      safely(() => modesIn(folder).every((mode) => nameSaysWhatHappened(mode.title))),
    tryNext: "name what happened, like Wrong spray dose, not how it felt, like Accuracy",
  },
  {
    says: "together the modes cover at least 8 in 10 of your notes that are not ok",
    test: (folder) => safely(() => modesCoverMostFlagged(folder)),
    tryNext: "find the flagged notes no mode lists yet, and add each one to the mode it fits",
  },
  {
    says: "own/rubric.md has Pass, Fail, Borderline rule and Examples for your first mode",
    test: (folder) =>
      safely(() => hasFile(ownFolder(folder), "rubric.md") && rubricHasHeadings(folder)),
    tryNext: "keep the four ## headings and write the rule for the mode with the most traces",
  },
  {
    says: "the rubric examples are your own ids: ok notes pass, flagged notes fail",
    test: (folder) => safely(() => rubricExamplesUseOwnNotes(folder)),
    tryNext: "write Pass: and Fail: lines with ids from own/notes.csv, ok ones first",
  },
  {
    says: "a Checked by: line says code or judge, and why, in at least 10 words",
    test: (folder) => safely(() => checkedByIsChosen(folder)),
    tryNext: "write Checked by: code if a plain rule can see the failure, else judge, then say why",
  },
  {
    says: "own/judge.md holds the rubric Pass and Fail text and asks for a critique first",
    test: (folder) =>
      safely(
        () =>
          hasFile(ownFolder(folder), "judge.md") &&
          judgeHoldsRubric(folder) &&
          judgeAsksForReasonFirst(folder),
      ),
    tryNext:
      "copy the Pass and Fail text from rubric.md into judge.md, then under Output ask for " +
      "a critique before the verdict",
  },
  {
    says: "own/judge.md shows 2 to 4 examples, all ids from your own notes",
    test: (folder) => safely(() => judgeExamplesAreOwn(folder)),
    tryNext: "list 2 to 4 ids from own/notes.csv under Examples, with the verdict and a reason",
  },
] satisfies Rule[];
