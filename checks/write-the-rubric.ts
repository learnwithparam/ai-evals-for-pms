import type { Rule } from "../scripts/verify";
import {
  field,
  hasFile,
  safely,
  sections,
  simplified,
  textIn,
  traceIdsIn,
  wordCount,
} from "./lib/files";
import { dataCsv } from "./lib/world";

const NEEDED_HEADINGS = ["pass", "fail", "borderline rule", "examples"];

// Words and patterns that turn pass or fail into a scale. A rubric with a scale cannot be checked.
const SCALE_WORDS = [
  /\b\d+\s*(to|-|out of)\s*(5|10)\b/i,
  /\b\d+\s*\/\s*(5|10)\b/,
  /\b(partly|partially|mostly|somewhat|fairly|kind of|sort of|a bit)\b/i,
  /\b(score|rating|stars?)\b/i,
];

const rubricIn = (folder: string) => textIn(folder, "rubric.md");

function sectionBody(folder: string, heading: string): string {
  const found = sections(rubricIn(folder)).find((section) => simplified(section.title) === heading);
  return found ? found.body : "";
}

// Ines's label for every draft she marked, like { T056: "fail" }.
function inesLabels(): Map<string, string> {
  const labels = dataCsv("expert-labels.csv");
  return new Map(labels.map((row) => [row.trace_id, row.label]));
}

function exampleIds(folder: string, label: "Pass" | "Fail"): string[] {
  const examples = sectionBody(folder, "examples");
  return [...new Set(traceIdsIn(field(examples, label)))];
}

function hasEveryHeading(folder: string): boolean {
  const titles = sections(rubricIn(folder)).map((section) => simplified(section.title));
  return NEEDED_HEADINGS.every((heading) => titles.includes(heading));
}

function passAndFailAreWritten(folder: string): boolean {
  const passText = sectionBody(folder, "pass");
  const failText = sectionBody(folder, "fail");
  return wordCount(passText) >= 10 && wordCount(failText) >= 10;
}

function hasTwoExamplesEach(folder: string): boolean {
  const known = inesLabels();
  const passIds = exampleIds(folder, "Pass").filter((id) => known.has(id));
  const failIds = exampleIds(folder, "Fail").filter((id) => known.has(id));
  return passIds.length >= 2 && failIds.length >= 2;
}

function examplesMatchInes(folder: string): boolean {
  const known = inesLabels();
  const passIdsMatch = exampleIds(folder, "Pass").every((id) => known.get(id) === "pass");
  const failIdsMatch = exampleIds(folder, "Fail").every((id) => known.get(id) === "fail");
  return passIdsMatch && failIdsMatch;
}

function hasNoScale(folder: string): boolean {
  const text = rubricIn(folder);
  return SCALE_WORDS.every((pattern) => !pattern.test(text));
}

// The "Checked by:" line says if a code rule or a judge model will grade this mode, and why.
function checkedByIsChosen(folder: string): boolean {
  const line = field(rubricIn(folder), "Checked by");
  const choice = simplified(line)
    .split(/\s+/)[0]
    ?.replace(/[^a-z]/g, "");
  return (choice === "code" || choice === "judge") && wordCount(line) >= 10;
}

export default [
  {
    says: "rubric.md has the headings Pass, Fail, Borderline rule and Examples",
    test: (folder) => safely(() => hasFile(folder, "rubric.md") && hasEveryHeading(folder)),
    tryNext: "keep the four ## headings from the starter: Pass, Fail, Borderline rule, Examples",
  },
  {
    says: "Pass and Fail each say in at least 10 words what to look for",
    test: (folder) => safely(() => passAndFailAreWritten(folder)),
    tryNext:
      "under Pass and under Fail, write what a designer can see in the draft, " +
      "like steep steps for a wheelchair user",
  },
  {
    says: "the Borderline rule decides the close case in at least 8 words",
    test: (folder) => safely(() => wordCount(sectionBody(folder, "borderline rule")) >= 8),
    tryNext:
      "look at T068 in the viewer: some steps and limited walking; write the rule that decides it",
  },
  {
    says: "Examples lists at least 2 pass and 2 fail drafts that Ines labelled",
    test: (folder) => safely(() => hasTwoExamplesEach(folder)),
    tryNext:
      "pick ids from world/data/expert-labels.csv and write them as Pass: T088, T068 " +
      "and Fail: T056, T149",
  },
  {
    says: "every pass example is a draft Ines passed, and every fail example one she failed",
    test: (folder) => safely(() => examplesMatchInes(folder)),
    tryNext: "look up each example id in world/data/expert-labels.csv and check its label",
  },
  {
    says: "the rubric has no scale: no 1 to 5, no score, no partly or mostly",
    test: (folder) => safely(() => hasNoScale(folder)),
    tryNext: "turn every scale into one question with a yes or no answer: pass or fail",
  },
  {
    says: "a Does not cover: line says what the rubric leaves out",
    test: (folder) => safely(() => wordCount(field(rubricIn(folder), "Does not cover")) >= 4),
    tryNext:
      "add a line like Does not cover: budget, diet, pace or closed days; " +
      "other rubrics check those",
  },
  {
    says: "a Checked by: line says code or judge, and why, in at least 10 words",
    test: (folder) => safely(() => checkedByIsChosen(folder)),
    tryNext:
      "add a line like Checked by: judge. A person must read the draft to see it. " +
      "Pick code only if a plain rule can see the failure",
  },
] satisfies Rule[];
