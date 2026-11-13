import type { Rule } from "../scripts/verify";
import { hasFile, safely, sections, simplified, textIn, traceIdsIn } from "./lib/files";
import { dataCsv } from "./lib/world";

// Words from the other failure modes. A prompt that checks one mode never needs them.
const OTHER_MODE_WORDS = [
  "budget",
  "closed",
  "opening hours",
  "season",
  "diet",
  "vegetarian",
  "vegan",
  "pace",
  "transfer",
  "travel time",
  "not in the catalogue",
];

const promptIn = (folder: string) => textIn(folder, "judge-prompt.md");

function sectionBody(text: string, heading: string): string {
  const found = sections(text).find((section) => simplified(section.title) === heading);
  return found ? found.body : "";
}

// The Pass or Fail text of the rubric, without its blank lines.
function rubricText(folder: string, heading: string): string {
  return simplified(sectionBody(textIn(folder, "rubric.md"), heading));
}

function containsRubric(folder: string): boolean {
  const prompt = simplified(promptIn(folder));
  const passText = rubricText(folder, "pass");
  const failText = rubricText(folder, "fail");
  return (
    passText !== "" && failText !== "" && prompt.includes(passText) && prompt.includes(failText)
  );
}

const exampleIds = (folder: string) => [
  ...new Set(traceIdsIn(sectionBody(promptIn(folder), "examples"))),
];

function hasTwoToFourExamples(folder: string): boolean {
  const count = exampleIds(folder).length;
  return count >= 2 && count <= 4;
}

function examplesComeFromTrain(folder: string): boolean {
  const train = new Set(dataCsv("splits/train.csv").map((row) => row.trace_id));
  const examples = exampleIds(folder);
  return examples.length > 0 && examples.every((id) => train.has(id));
}

function examplesShowPassAndFail(folder: string): boolean {
  const inesSays = new Map(dataCsv("expert-labels.csv").map((row) => [row.trace_id, row.label]));
  const labels = new Set(exampleIds(folder).map((id) => inesSays.get(id)));
  return labels.has("pass") && labels.has("fail");
}

// In the Output section, the reason must come before the verdict.
function asksForReasonFirst(folder: string): boolean {
  const output = sectionBody(promptIn(folder), "output").toLowerCase();
  const reasonAt = output.search(/\b(critique|reason)\b/);
  const verdictAt = output.search(/\bverdict\b/);
  return reasonAt >= 0 && verdictAt > reasonAt;
}

function checksMobilityOnly(folder: string): boolean {
  const prompt = promptIn(folder).toLowerCase();
  const namesMobility = /mobility|step-free|wheelchair/.test(prompt);
  const namesAnotherMode = OTHER_MODE_WORDS.some((word) => prompt.includes(word));
  return namesMobility && !namesAnotherMode;
}

export default [
  {
    says: "judge-prompt.md and rubric.md are in this folder",
    test: (folder) => hasFile(folder, "judge-prompt.md") && hasFile(folder, "rubric.md"),
    tryNext: "keep the starter rubric.md here, or copy your own rubric.md from define-good",
  },
  {
    says: "the prompt holds the Pass and Fail text of rubric.md, word for word",
    test: (folder) => safely(() => containsRubric(folder)),
    tryNext: "copy the text under ## Pass and ## Fail in rubric.md into the prompt, unchanged",
  },
  {
    says: "the ## Examples section has 2 to 4 drafts",
    test: (folder) => safely(() => hasTwoToFourExamples(folder)),
    tryNext: "pick 2 to 4 drafts from world/data/splits/train.csv and list their ids",
  },
  {
    says: "every example comes from world/data/splits/train.csv",
    test: (folder) => safely(() => examplesComeFromTrain(folder)),
    tryNext:
      "an id from dev or test leaks the answers into the judge; " +
      "swap it for an id from splits/train.csv",
  },
  {
    says: "the examples show at least one pass and one fail from Ines",
    test: (folder) => safely(() => examplesShowPassAndFail(folder)),
    tryNext:
      "look up the examples in expert-labels.csv; include one Ines passed and one she failed",
  },
  {
    says: "the ## Output section asks for the reason before the verdict",
    test: (folder) => safely(() => asksForReasonFirst(folder)),
    tryNext: "in ## Output, ask for the critique first, then the verdict: pass or fail",
  },
  {
    says: "the prompt checks mobility only, and names no other failure mode",
    test: (folder) => safely(() => checksMobilityOnly(folder)),
    tryNext:
      "remove what the prompt says about budget, diet, pace, closed days or seasons; " +
      "one judge, one mode",
  },
] satisfies Rule[];
