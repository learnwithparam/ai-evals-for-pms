import type { Rule } from "../scripts/verify";
import { field, has, safely, textIn, words } from "./lib/files";
import { draftPlannerRunsInReplay } from "./lib/replay";
import { catalogue, traces, worldExists } from "./lib/world";

const q = (d: string) => field(textIn(d, "question.md"), "Question");
const who = (d: string) => field(textIn(d, "question.md"), "Who decides");

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
    test: (d) => has(d, "question.md"),
    tryNext: "open question.md in this problem folder and fill in both lines",
  },
  {
    says: "the Question: line asks how often something goes wrong",
    test: (d) => safely(() => words(q(d)) >= 6 && /how (often|many)/i.test(q(d))),
    tryNext: "write the question the boss asked you, in your own words, starting with How often",
  },
  {
    says: "the Who decides: line names the head designer, Ines Duarte",
    test: (d) => safely(() => /\bin[eê]s\b/i.test(who(d)) && /duarte/i.test(who(d))),
    tryNext:
      "read the Meet Lantern Trails tab in the viewer again and find who signs off every trip",
  },
] satisfies Rule[];
