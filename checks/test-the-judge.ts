import type { Rule } from "../scripts/verify";
import { field, hasFile, safely, sections, simplified, textIn, wordCount } from "./lib/files";
import { dataCsv } from "./lib/world";

type Rates = { truePositiveRate: number; trueNegativeRate: number };

const checkIn = (folder: string) => textIn(folder, "judge-check.md");

// The first number after a label, like "TPR: 0.93". A percent becomes a share: 93% is 0.93.
export function numberAfter(text: string, label: string): number {
  const found = field(text, label).match(/-?\d+(\.\d+)?\s*%?/);
  if (!found) return Number.NaN;
  const value = Number.parseFloat(found[0]);
  if (found[0].includes("%")) return value / 100;
  return value;
}

export const closeTo = (stated: number, truth: number) => Math.abs(stated - truth) <= 0.01;

// How often a judge agrees with Ines: on drafts she passed (TPR), and on those she failed (TNR).
export function judgeRates(judgeFile: string): Rates {
  const inesSays = new Map(dataCsv("expert-labels.csv").map((row) => [row.trace_id, row.label]));
  const verdicts = dataCsv(`judges/${judgeFile}`);
  const inesPassed = verdicts.filter((row) => inesSays.get(row.trace_id) === "pass");
  const inesFailed = verdicts.filter((row) => inesSays.get(row.trace_id) === "fail");
  const judgePassed = inesPassed.filter((row) => row.verdict === "pass");
  const judgeFailed = inesFailed.filter((row) => row.verdict === "fail");
  return {
    truePositiveRate: judgePassed.length / inesPassed.length,
    trueNegativeRate: judgeFailed.length / inesFailed.length,
  };
}

// The section whose heading names a judge, like "## judge-mobility-pass-fail".
function sectionAbout(folder: string, word: string): string {
  const found = sections(checkIn(folder)).find((section) =>
    simplified(section.title).includes(word),
  );
  return found ? found.body : "";
}

function statesRates(folder: string, word: string, judgeFile: string): boolean {
  const body = sectionAbout(folder, word);
  const truth = judgeRates(judgeFile);
  const tprIsRight = closeTo(numberAfter(body, "TPR"), truth.truePositiveRate);
  const tnrIsRight = closeTo(numberAfter(body, "TNR"), truth.trueNegativeRate);
  return tprIsRight && tnrIsRight;
}

function picksTheMobilityJudge(folder: string): boolean {
  const pick = simplified(field(checkIn(folder), "Pick"));
  return pick.includes("mobility") && !pick.includes("generic");
}

function explainsTheScoreJudge(folder: string): boolean {
  const body = sectionAbout(folder, "1 to 5");
  const mentionsPassLine = /\bpass/i.test(body);
  return wordCount(body) >= 8 && mentionsPassLine;
}

export default [
  {
    says: "judge-check.md has a section for the generic, mobility and 1 to 5 judges",
    test: (folder) =>
      safely(() => {
        if (!hasFile(folder, "judge-check.md")) return false;
        const words = ["generic", "mobility", "1 to 5"];
        return words.every((word) => sectionAbout(folder, word) !== "");
      }),
    tryNext: "keep the three ## headings from the starter judge-check.md",
  },
  {
    says: "the generic judge's TPR and TNR are each within 0.01 of the true values",
    test: (folder) => safely(() => statesRates(folder, "generic", "judge-generic-pass-fail.csv")),
    tryNext:
      "TPR: of the drafts Ines passed, the share the judge passed; TNR: of the drafts " +
      "Ines failed, the share the judge failed",
  },
  {
    says: "the mobility judge's TPR and TNR are each within 0.01 of the true values",
    test: (folder) => safely(() => statesRates(folder, "mobility", "judge-mobility-pass-fail.csv")),
    tryNext:
      "count with COUNTIFS on Ines's label and the judge's verdict, then divide by the " +
      "number Ines passed (for TPR) or failed (for TNR)",
  },
  {
    says: "Pick: names the mobility judge, the only one with both rates at 0.80 or more",
    test: (folder) => safely(() => picksTheMobilityJudge(folder)),
    tryNext:
      "look at the lower of the two rates for each judge; " +
      "pick the judge whose lower rate is still 0.80 or more",
  },
  {
    says: "the 1 to 5 section says in 8 or more words why it cannot be checked without a pass line",
    test: (folder) => safely(() => explainsTheScoreJudge(folder)),
    tryNext:
      "Ines says pass or fail; a 4 is neither, so say what you would need before you " +
      "can compare a score with her",
  },
] satisfies Rule[];
