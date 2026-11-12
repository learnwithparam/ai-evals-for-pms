import type { Rule } from "../scripts/verify";
import { has, csvIn, textIn, isOk, words, sections, field, traceIds, norm, safely } from "./lib/files";

const VAGUE = new Set(["quality", "helpfulness", "helpful", "accuracy", "accurate", "inaccurate", "relevance", "relevant", "coherence", "tone", "bad", "poor", "wrong", "error", "errors", "issue", "issues", "problem", "problems", "other", "misc", "general", "mistake", "mistakes", "hallucination", "hallucinations", "the", "a", "an", "low", "draft", "drafts", "output", "plan", "itinerary"]);

const modes = (d: string) => sections(textIn(d, "failure-modes.md"));
const notBad = (d: string) => {
  const n = csvIn(d, "notes.csv");
  return { all: new Set(n.map((r) => r.trace_id.toUpperCase())), flagged: new Set(n.filter((r) => !isOk(r.note)).map((r) => r.trace_id.toUpperCase())) };
};

export default [
  {
    says: "notes.csv from the last step is in this folder",
    test: (d) => safely(() => has(d, "notes.csv") && "note" in csvIn(d, "notes.csv")[0]),
    tryNext: "the starter has a notes.csv; put it back, or copy in your own notes.csv from read-the-traces",
  },
  { says: "failure-modes.md is in this folder", test: (d) => has(d, "failure-modes.md"), tryNext: "open failure-modes.md in this problem folder and fill it in" },
  {
    says: "it names 4 to 8 failure modes, each under its own ## heading",
    test: (d) => safely(() => { const n = modes(d).length; return n >= 4 && n <= 8; }),
    tryNext: "group notes that describe the same problem; merge groups with one note, split a group that mixes two problems",
  },
  {
    says: "every mode has a Definition: line of at least 6 words",
    test: (d) => safely(() => modes(d).every((m) => words(field(m.body, "Definition")) >= 6)),
    tryNext: "under each heading write Definition: and one sentence a designer could use to spot it",
  },
  {
    says: "every mode lists at least 2 drafts on its Traces: line",
    test: (d) => safely(() => modes(d).every((m) => new Set(traceIds(field(m.body, "Traces"))).size >= 2)),
    tryNext: "add the ids of at least two drafts, like Traces: T020, T199",
  },
  {
    says: "every draft you list has a note that is not ok",
    test: (d) => safely(() => { const { flagged } = notBad(d); return modes(d).every((m) => traceIds(field(m.body, "Traces")).every((id) => flagged.has(id))); }),
    tryNext: "check each id against notes.csv; only list drafts where your note says what went wrong",
  },
  {
    says: "no mode is named with only a vague word like quality or accuracy",
    test: (d) => safely(() => modes(d).every((m) => norm(m.title).split(" ").some((w) => w && !VAGUE.has(w)))),
    tryNext: "name what happened, like Closed on the day, not what it felt like, like Quality",
  },
  {
    says: "together the modes cover at least 8 in 10 of your notes that are not ok",
    test: (d) => safely(() => {
      const { flagged } = notBad(d);
      const covered = new Set(modes(d).flatMap((m) => traceIds(field(m.body, "Traces"))));
      return flagged.size > 0 && [...flagged].filter((id) => covered.has(id)).length / flagged.size >= 0.8;
    }),
    tryNext: "find the flagged notes no mode lists yet, and add each one to the mode it fits",
  },
] satisfies Rule[];
