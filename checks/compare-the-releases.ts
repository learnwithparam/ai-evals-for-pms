import type { Rule } from "../scripts/verify";
import { hasFile, safely, simplified, textIn } from "./lib/files";
import { dataCsv } from "./lib/world";
import criteriaRules, {
  type Criterion,
  criteriaIn,
  firstNumberIn,
  isCritical,
  sameLineAfter,
  worldModeFor,
} from "./set-launch-criteria";

const VERDICTS = ["ship with conditions", "ship", "block"];

const decisionIn = (folder: string) => textIn(folder, "release-decision.md");

function releaseRow(release: string): Record<string, string> {
  const summary = dataCsv("releases/summary.csv");
  const row = summary.find((candidate) => candidate.release === release);
  if (!row) throw new Error(`no release called ${release}`);
  return row;
}

// Does the release meet one row of the criteria? "at most 2%" is a share; "at most 1" is a count.
function meetsCriterion(release: Record<string, string>, criterion: Criterion): boolean {
  const failures = Number(release[worldModeFor(criterion.mode) ?? ""]);
  const limit = firstNumberIn(criterion.threshold);
  if (criterion.threshold.includes("%")) {
    const failurePercent = (failures / Number(release.drafts)) * 100;
    return failurePercent <= limit;
  }
  return failures <= limit;
}

function brokenCriteria(folder: string): Criterion[] {
  const cheaperModel = releaseRow("cheaper-model");
  return criteriaIn(folder).filter((criterion) => !meetsCriterion(cheaperModel, criterion));
}

// What the learner's own criteria say about the cheaper model.
function verdictFromCriteria(folder: string): string {
  const broken = brokenCriteria(folder);
  if (broken.some(isCritical)) return "block";
  if (broken.length > 0) return "ship with conditions";
  return "ship";
}

function statedVerdict(folder: string): string {
  const verdictLine = simplified(sameLineAfter(decisionIn(folder), "Verdict"));
  return VERDICTS.find((verdict) => verdictLine.startsWith(verdict)) ?? "";
}

// Every number in the release summary, also as a percent: 0.88 is also 88.
function releaseNumbers(): Set<number> {
  const numbers = new Set<number>();
  for (const row of dataCsv("releases/summary.csv")) {
    for (const cell of Object.values(row)) {
      const value = Number(cell);
      if (Number.isNaN(value)) continue;
      numbers.add(value);
      if (value < 1) numbers.add(Math.round(value * 1000) / 10);
    }
  }
  return numbers;
}

function numbersFoundInReleases(folder: string): number {
  const withoutVerdict = decisionIn(folder).replace(/^.*verdict\s*:.*$/im, "");
  const withoutIds = withoutVerdict.replace(/\b[TRE]\d{3}\b/g, "");
  const cited = (withoutIds.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  const known = releaseNumbers();
  return new Set(cited.filter((number) => known.has(number))).size;
}

// A block must name the critical mode that caused it, so a reader knows what to fix.
function namesTheBlockingMode(folder: string): boolean {
  if (statedVerdict(folder) !== "block") return true;
  const text = simplified(decisionIn(folder));
  const blocking = brokenCriteria(folder).filter(isCritical);
  return blocking.some((criterion) => text.includes(simplified(criterion.mode)));
}

export default [
  {
    says: "launch-criteria.md is in this folder and passes its check",
    test: (folder) => safely(() => criteriaRules.every((rule) => rule.test(folder) === true)),
    tryNext:
      "copy your launch-criteria.md and failure-modes.md here, " +
      "then run bun run verify set-launch-criteria to see what is missing",
  },
  {
    says: "release-decision.md has a Verdict: line that says ship, block, or ship with conditions",
    test: (folder) =>
      safely(() => hasFile(folder, "release-decision.md") && statedVerdict(folder) !== ""),
    tryNext: "start the file with one line, like Verdict: block",
  },
  {
    says: "it cites at least 3 numbers from world/data/releases/summary.csv",
    test: (folder) => safely(() => numbersFoundInReleases(folder) >= 3),
    tryNext: "copy numbers straight from summary.csv, like 132 of 150 or 7 fails on mobility",
  },
  {
    says: "the verdict is what your own launch criteria give for the cheaper model",
    test: (folder) => safely(() => statedVerdict(folder) === verdictFromCriteria(folder)),
    tryNext:
      "go row by row: compare each threshold with the cheaper-model row of summary.csv; " +
      "a broken critical row means block",
  },
  {
    says: "a block names the critical mode that broke its threshold",
    test: (folder) => safely(() => namesTheBlockingMode(folder)),
    tryNext: "name the critical mode in a sentence, spelled as in launch-criteria.md",
  },
] satisfies Rule[];
