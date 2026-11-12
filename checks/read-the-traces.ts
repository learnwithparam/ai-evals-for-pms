import type { Rule } from "../scripts/verify";
import { has, csvIn, isOk, words, safely } from "./lib/files";
import { sampleIds, faultyIds } from "./lib/world";

const notes = (d: string) => csvIn(d, "notes.csv");

export default [
  { says: "notes.csv is in this folder", test: (d) => has(d, "notes.csv"), tryNext: "click Download notes.csv in the viewer, then move the file into this problem folder" },
  {
    says: "notes.csv has the columns trace_id and note",
    test: (d) => safely(() => { const n = notes(d); return n.length > 0 && "trace_id" in n[0] && "note" in n[0]; }),
    tryNext: "keep the first row as it was: trace_id,note",
  },
  {
    says: "it has the 30 drafts from your sample, each one once",
    test: (d) => safely(() => {
      const ids = notes(d).map((r) => r.trace_id.toUpperCase());
      const want = new Set(sampleIds());
      return ids.length === 30 && new Set(ids).size === 30 && ids.every((i) => want.has(i));
    }),
    tryNext: "start again from the starter notes.csv, which lists your 30 drafts, and do not add or remove rows",
  },
  {
    says: "every note is filled in: the word ok, or at least 6 words that say what you saw",
    test: (d) => safely(() => notes(d).every((r) => isOk(r.note) || words(r.note) >= 6)),
    tryNext: "find the empty or very short notes and write what you saw, like: the museum is shut on the day it is booked",
  },
  {
    says: "you spotted most of the drafts with a real problem",
    test: (d) => safely(() => {
      const bad = faultyIds("sample");
      const hit = notes(d).filter((r) => bad.has(r.trace_id.toUpperCase()) && !isOk(r.note)).length;
      return hit >= Math.ceil(bad.size * 0.75);
    }),
    tryNext: "open each draft you marked ok and check it against the request: budget, closed days, walking, food and travel times",
  },
  {
    says: "you did not flag every draft: at least 5 notes say ok",
    test: (d) => safely(() => notes(d).filter((r) => isOk(r.note)).length >= 5),
    tryNext: "a note is for something a designer would fix; if a draft is fine, write ok",
  },
] satisfies Rule[];
