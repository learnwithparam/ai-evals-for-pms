import type { Rule } from "../scripts/verify";
import labelRules from "./label-the-golden-set";
import {
  csvIn,
  field,
  hasFile,
  safely,
  sections,
  simplified,
  textIn,
  traceIdsIn,
} from "./lib/files";
import { dataCsv } from "./lib/world";

// The three ways to settle a disagreement. Each listed draft names exactly one.
const RESOLUTIONS = ["keep mine", "adopt ines", "change the rubric"];

type Pair = { mine: string; ines: string };

const compareIn = (folder: string) => textIn(folder, "compare.md");

// Your label and Ines's label for each of the 40 drafts you labelled.
function labelPairs(folder: string): Map<string, Pair> {
  const inesSays = new Map(dataCsv("expert-labels.csv").map((row) => [row.trace_id, row.label]));
  const pairs = new Map<string, Pair>();
  for (const row of csvIn(folder, "labels.csv")) {
    const id = row.trace_id.toUpperCase();
    pairs.set(id, { mine: row.label.toLowerCase(), ines: inesSays.get(id) ?? "" });
  }
  return pairs;
}

function trueAgreement(pairs: Pair[]): number {
  const same = pairs.filter((pair) => pair.mine === pair.ines);
  return same.length / pairs.length;
}

// Cohen's kappa: how much better than chance the two people agree.
function trueKappa(pairs: Pair[]): number {
  const observed = trueAgreement(pairs);
  const shareOf = (who: "mine" | "ines", label: string) =>
    pairs.filter((pair) => pair[who] === label).length / pairs.length;
  const bothPassByChance = shareOf("mine", "pass") * shareOf("ines", "pass");
  const bothFailByChance = shareOf("mine", "fail") * shareOf("ines", "fail");
  const expected = bothPassByChance + bothFailByChance;
  return (observed - expected) / (1 - expected);
}

// The first number after a label, like "Agreement: 95%". A percent becomes a share: 95% is 0.95.
export function numberAfter(text: string, label: string): number {
  const found = field(text, label).match(/-?\d+(\.\d+)?\s*%?/);
  if (!found) return Number.NaN;
  const value = Number.parseFloat(found[0]);
  return found[0].includes("%") ? value / 100 : value;
}

function statesAgreement(folder: string): boolean {
  const pairs = [...labelPairs(folder).values()];
  const stated = numberAfter(compareIn(folder), "Agreement");
  return Math.abs(stated - trueAgreement(pairs)) <= 0.01;
}

function statesKappa(folder: string): boolean {
  const pairs = [...labelPairs(folder).values()];
  const stated = numberAfter(compareIn(folder), "Kappa");
  return Math.abs(stated - trueKappa(pairs)) <= 0.01;
}

function disagreementIds(folder: string): string[] {
  const pairs = [...labelPairs(folder).entries()];
  const different = pairs.filter(([, pair]) => pair.mine !== pair.ines);
  return different.map(([id]) => id);
}

// The lines under "## Disagreements" that name a draft.
function listedLines(folder: string): string[] {
  const disagreements = sections(compareIn(folder)).find(
    (section) => simplified(section.title) === "disagreements",
  );
  if (!disagreements) return [];
  const lines = disagreements.body.split("\n");
  return lines.filter((line) => traceIdsIn(line).length > 0);
}

function everyDisagreementIsListed(folder: string): boolean {
  const listedIds = listedLines(folder).flatMap(traceIdsIn);
  return disagreementIds(folder).every((id) => listedIds.includes(id));
}

function onlyRealDisagreementsAreListed(folder: string): boolean {
  const real = disagreementIds(folder);
  const listedIds = listedLines(folder).flatMap(traceIdsIn);
  return listedIds.every((id) => real.includes(id));
}

function everyLineHasOneResolution(folder: string): boolean {
  const resolutionsOn = (line: string) =>
    RESOLUTIONS.filter((resolution) => simplified(line).includes(resolution));
  return listedLines(folder).every((line) => resolutionsOn(line).length === 1);
}

function labelsAreValid(folder: string): boolean {
  return labelRules.every((rule) => rule.test(folder) === true);
}

export default [
  {
    says: "labels.csv from the last step is in this folder and passes its check",
    test: (folder) => safely(() => labelsAreValid(folder)),
    tryNext:
      "copy your labels.csv from label-the-golden-set here, or keep the sample one; " +
      "then run bun run verify label-the-golden-set to see what is missing",
  },
  {
    says: "compare.md states Agreement: within 0.01 of the true value",
    test: (folder) => safely(() => hasFile(folder, "compare.md") && statesAgreement(folder)),
    tryNext:
      "count the drafts where your label equals Ines's label, and divide by 40; " +
      "write it like Agreement: 0.90",
  },
  {
    says: "compare.md states Kappa: within 0.01 of the true value",
    test: (folder) => safely(() => statesKappa(folder)),
    tryNext:
      "kappa is (agreement - chance) / (1 - chance); chance is your pass share times " +
      "Ines's pass share, plus your fail share times hers",
  },
  {
    says: "every draft where you and Ines differ is listed under ## Disagreements",
    test: (folder) => safely(() => everyDisagreementIsListed(folder)),
    tryNext:
      "add a column that says same or different next to each label, filter to different, " +
      "and list every one of those ids",
  },
  {
    says: "every draft under ## Disagreements is one where you and Ines differ",
    test: (folder) => safely(() => onlyRealDisagreementsAreListed(folder)),
    tryNext: "remove the ids where your label and Ines's label are the same",
  },
  {
    says: "each disagreement has one resolution: keep mine, adopt Ines's, or change the rubric",
    test: (folder) => safely(() => everyLineHasOneResolution(folder)),
    tryNext:
      "on each line, write exactly one of: keep mine, adopt Ines's, change the rubric; " +
      "then say why",
  },
] satisfies Rule[];
