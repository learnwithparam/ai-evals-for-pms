import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, isOk, safely, sections, simplified, textIn, wordCount } from "./lib/files";
import { firstNumberIn, sameLineAfter } from "./set-launch-criteria";

// This check reads only the learner's own folder. It never reads the Lantern Trails world.
const HEADINGS_IN_ORDER = [
  "outcome",
  "failure modes",
  "thresholds",
  "grader",
  "repeat runs",
  "business case",
  "evidence",
];

const ownFolder = (folder: string) => join(folder, "own");
const planIn = (folder: string) => sections(textIn(ownFolder(folder), "eval-plan.md"));
const modesIn = (folder: string) => sections(textIn(ownFolder(folder), "failure-modes.md"));
const notesIn = (folder: string) => csvIn(ownFolder(folder), "notes.csv");

function bodyOf(folder: string, heading: string): string {
  const found = planIn(folder).find((section) => simplified(section.title) === heading);
  return found ? found.body : "";
}

function headingsAreInOrder(folder: string): boolean {
  const titles = planIn(folder).map((section) => simplified(section.title));
  const wanted = titles.filter((title) => HEADINGS_IN_ORDER.includes(title));
  return wanted.join("|") === HEADINGS_IN_ORDER.join("|");
}

function lineFor(folder: string, mode: string): string {
  const lines = bodyOf(folder, "failure modes").split("\n");
  return lines.find((line) => simplified(line).includes(simplified(mode))) ?? "";
}

function everyModeHasThreshold(folder: string): boolean {
  const modes = modesIn(folder);
  const hasNumber = (mode: string) => /\d/.test(lineFor(folder, mode));
  return modes.length > 0 && modes.every((mode) => hasNumber(mode.title));
}

function oneModeIsCritical(folder: string): boolean {
  return /critical/i.test(bodyOf(folder, "failure modes"));
}

function choiceIn(text: string): string {
  const line = sameLineAfter(text, "Checked by");
  return (
    simplified(line)
      .split(" ")[0]
      ?.replace(/[^a-z]/g, "") ?? ""
  );
}

function graderMatchesRubric(folder: string): boolean {
  const planChoice = choiceIn(bodyOf(folder, "grader"));
  const rubricChoice = choiceIn(textIn(ownFolder(folder), "rubric.md"));
  return (planChoice === "code" || planChoice === "judge") && planChoice === rubricChoice;
}

function repeatRunsAreStated(folder: string): boolean {
  const body = bodyOf(folder, "repeat runs");
  const runs = firstNumberIn(sameLineAfter(body, "Runs"));
  const spread = sameLineAfter(body, "Spread");
  return runs >= 3 && /\d/.test(spread) && wordCount(spread) >= 8;
}

function businessCaseHasNumber(folder: string): boolean {
  const body = bodyOf(folder, "business case");
  return wordCount(body) >= 10 && /\d/.test(body);
}

// Evidence is real: at least 3 listed ids are rows of your notes.csv that are not ok.
function evidenceIsYours(folder: string): boolean {
  const listed = sameLineAfter(bodyOf(folder, "evidence"), "Traces").split(/[,;]/);
  const ids = listed.map((id) => simplified(id)).filter(Boolean);
  const flagged = notesIn(folder).filter((row) => !isOk(row.note));
  const flaggedIds = new Set(flagged.map((row) => simplified(row.trace_id)));
  return ids.length >= 3 && ids.every((id) => flaggedIds.has(id));
}

export default [
  {
    says: "own/eval-plan.md has the seven ## headings, in order",
    test: (folder) =>
      safely(() => hasFile(ownFolder(folder), "eval-plan.md") && headingsAreInOrder(folder)),
    tryNext:
      "keep the starter headings: Outcome, Failure modes, Thresholds, Grader, Repeat runs, " +
      "Business case, Evidence",
  },
  {
    says: "Outcome says in at least 10 words what a good result is for your user",
    test: (folder) => safely(() => wordCount(bodyOf(folder, "outcome")) >= 10),
    tryNext: "write one sentence: what can your user do when the feature gets it right?",
  },
  {
    says: "Failure modes gives every mode in your own failure-modes.md a number limit",
    test: (folder) => safely(() => everyModeHasThreshold(folder)),
    tryNext: "write one line per mode, like Wrong spray dose: at most 1 fail in 100 answers",
  },
  {
    says: "at least one mode is marked Critical",
    test: (folder) => safely(() => oneModeIsCritical(folder)),
    tryNext: "add the word Critical to the mode that must never ship broken",
  },
  {
    says: "Grader says code or judge, the same as the Checked by: line of your rubric",
    test: (folder) => safely(() => graderMatchesRubric(folder)),
    tryNext: "copy the choice from own/rubric.md, or change both so they agree",
  },
  {
    says: "Repeat runs has Runs: of 3 or more and a Spread: line with a number",
    test: (folder) => safely(() => repeatRunsAreStated(folder)),
    tryNext:
      "run your feature again 3 or more times; write Runs: and a Spread: sentence that " +
      "says how far the pass count moved",
  },
  {
    says: "Business case has a number and at least 10 words",
    test: (folder) => safely(() => businessCaseHasNumber(folder)),
    tryNext: "say who pays when this fails, with one real number like euros, hours or refunds",
  },
  {
    says: "Evidence lists at least 3 ids from your own notes.csv that are not ok",
    test: (folder) => safely(() => evidenceIsYours(folder)),
    tryNext: "on the Traces: line, list ids from own/notes.csv whose note says what went wrong",
  },
] satisfies Rule[];
