import type { Rule } from "../scripts/verify";
import { field, hasFile, safely, textIn, wordCount } from "./lib/files";
import { closeTo, judgeRates, numberAfter } from "./test-the-judge";

// The step states this: the mobility judge ran on all 300 drafts and passed 250 of them.
const JUDGE_PASSED = 250;
const DRAFTS_JUDGED = 300;

const correctedIn = (folder: string) => textIn(folder, "corrected.md");
const mobilityRates = () => judgeRates("judge-mobility-pass-fail.csv");

// Rogan-Gladen: the pass rate you would see with a perfect judge.
function correctedPassRate(): number {
  const rawRate = JUDGE_PASSED / DRAFTS_JUDGED;
  const rates = mobilityRates();
  const numerator = rawRate + rates.trueNegativeRate - 1;
  const denominator = rates.truePositiveRate + rates.trueNegativeRate - 1;
  return numerator / denominator;
}

function usesTheMobilityRates(folder: string): boolean {
  const text = correctedIn(folder);
  const rates = mobilityRates();
  const tprIsRight = closeTo(numberAfter(text, "TPR"), rates.truePositiveRate);
  const tnrIsRight = closeTo(numberAfter(text, "TNR"), rates.trueNegativeRate);
  return tprIsRight && tnrIsRight;
}

export default [
  {
    says: "corrected.md states the Raw pass rate: of the judge, 250 of 300",
    test: (folder) =>
      safely(() => {
        if (!hasFile(folder, "corrected.md")) return false;
        const stated = numberAfter(correctedIn(folder), "Raw pass rate");
        return closeTo(stated, JUDGE_PASSED / DRAFTS_JUDGED);
      }),
    tryNext: "divide 250 by 300 and write it like Raw pass rate: 0.833",
  },
  {
    says: "the TPR: and TNR: lines hold the mobility judge's rates from test-the-judge",
    test: (folder) => safely(() => usesTheMobilityRates(folder)),
    tryNext: "copy TPR and TNR from the mobility judge in your judge-check.md, not the generic one",
  },
  {
    says: "the Corrected pass rate: is within 0.01 of the Rogan-Gladen value",
    test: (folder) =>
      safely(() => {
        const stated = numberAfter(correctedIn(folder), "Corrected pass rate");
        return closeTo(stated, correctedPassRate());
      }),
    tryNext: "work out (raw + TNR - 1) / (TPR + TNR - 1) in one spreadsheet cell",
  },
  {
    says: "a Why: line says in 8 or more words why the raw rate is wrong",
    test: (folder) => safely(() => wordCount(field(correctedIn(folder), "Why")) >= 8),
    tryNext: "say what the judge gets wrong: it fails some good drafts and passes some bad ones",
  },
] satisfies Rule[];
