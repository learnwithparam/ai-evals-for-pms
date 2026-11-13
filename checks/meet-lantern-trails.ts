import type { Rule } from "../scripts/verify";
import { field, hasFile, safely, textIn, wordCount } from "./lib/files";
import { draftPlannerRunsInReplay } from "./lib/replay";
import { catalogue, traces, worldExists } from "./lib/world";

const questionLine = (folder: string) => field(textIn(folder, "question.md"), "Question");
const whoDecidesLine = (folder: string) => field(textIn(folder, "question.md"), "Who decides");

function asksHowOften(folder: string): boolean {
  const question = questionLine(folder);
  return wordCount(question) >= 6 && /how (often|many)/i.test(question);
}

function namesInesDuarte(folder: string): boolean {
  const whoDecides = whoDecidesLine(folder);
  return /\bin[eê]s\b/i.test(whoDecides) && /duarte/i.test(whoDecides);
}

export default [
  {
    says: "the world is in place: 300 drafts and 220 catalogue items",
    test: () =>
      safely(() => worldExists() && traces().length === 300 && catalogue().length === 220),
    tryNext: "run bun run world reset, then run this check again",
  },
  {
    says: "Draft Planner runs three times with no key and logs every run",
    test: () => draftPlannerRunsInReplay("R001", 3),
    tryNext: "run bun run draft R001 and read the last line it prints",
  },
  {
    says: "question.md is in this folder",
    test: (folder) => hasFile(folder, "question.md"),
    tryNext: "open question.md in this problem folder and fill in both lines",
  },
  {
    says: "the Question: line asks how often something goes wrong",
    test: (folder) => safely(() => asksHowOften(folder)),
    tryNext: "write the question the boss asked you, in your own words, starting with How often",
  },
  {
    says: "the Who decides: line names the head designer, Ines Duarte",
    test: (folder) => safely(() => namesInesDuarte(folder)),
    tryNext:
      "read the Meet Lantern Trails tab in the viewer again and find who signs off every trip",
  },
] satisfies Rule[];
