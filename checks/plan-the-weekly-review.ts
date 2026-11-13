import type { Rule } from "../scripts/verify";
import { hasFile, safely, simplified, textIn, wordCount } from "./lib/files";
import { sameLineAfter } from "./set-launch-criteria";

const planIn = (folder: string) => textIn(folder, "review-plan.md");
const lineAfter = (folder: string, label: string) => sameLineAfter(planIn(folder), label);
const firstNumberIn = (text: string) => Number.parseFloat(text.match(/\d+(\.\d+)?/)?.[0] ?? "");

// Random drafts find new problems; flagged drafts find the costly ones. A plan needs both.
function mixHasRandomAndFlagged(folder: string): boolean {
  const mix = simplified(lineAfter(folder, "Mix"));
  const hasRandom = /random/.test(mix);
  const hasFlagged = /flag|refund|rewrit|complain/.test(mix);
  return hasRandom && hasFlagged;
}

export default [
  {
    says: "review-plan.md states Drafts each cycle: as a number, 20 or more",
    test: (folder) =>
      safely(() => {
        if (!hasFile(folder, "review-plan.md")) return false;
        return firstNumberIn(lineAfter(folder, "Drafts each cycle")) >= 20;
      }),
    tryNext: "write how many drafts are read each time, like Drafts each cycle: 30",
  },
  {
    says: "the Mix: line has drafts picked at random and drafts flagged by a refund or a rewrite",
    test: (folder) => safely(() => mixHasRandomAndFlagged(folder)),
    tryNext: "write a mix like: 20 at random, 10 flagged by a refund or a designer rewrite",
  },
  {
    says: "the Reader: line names who reads the drafts",
    test: (folder) => safely(() => wordCount(lineAfter(folder, "Reader")) >= 1),
    tryNext: "name one person, like Reader: Ines Duarte",
  },
  {
    says: "the Minutes: line gives the reading time as a number",
    test: (folder) => safely(() => firstNumberIn(lineAfter(folder, "Minutes")) > 0),
    tryNext: "about 1 to 2 minutes a draft; write it like Minutes: 45",
  },
  {
    says: "the Alert rule: has a number in it",
    test: (folder) => safely(() => !Number.isNaN(firstNumberIn(lineAfter(folder, "Alert rule")))),
    tryNext: "turn the alert into a number, like: more than 1 mobility fail in one cycle",
  },
  {
    says: "the On alert: line says in 6 or more words what happens next",
    test: (folder) => safely(() => wordCount(lineAfter(folder, "On alert")) >= 6),
    tryNext: "say who does what, like: Ines tells the engineering lead, and instant drafts stop",
  },
] satisfies Rule[];
