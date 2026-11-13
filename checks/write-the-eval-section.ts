import type { Rule } from "../scripts/verify";
import { hasFile, safely, sections, simplified, textIn, wordCount } from "./lib/files";
import criteriaRules, {
  criteriaIn,
  failureModeNames,
  firstNumberIn,
  isCritical,
  sameLineAfter,
} from "./set-launch-criteria";

const HEADINGS_IN_ORDER = [
  "user outcome",
  "failure modes",
  "metrics and thresholds",
  "golden set",
  "judges",
  "launch rule",
  "after launch",
];

const sectionsIn = (folder: string) => sections(textIn(folder, "prd-eval-section.md"));

function sectionBody(folder: string, heading: string): string {
  const found = sectionsIn(folder).find((section) => simplified(section.title) === heading);
  return found ? found.body : "";
}

function headingsAreInOrder(folder: string): boolean {
  const titles = sectionsIn(folder).map((section) => simplified(section.title));
  const wanted = titles.filter((title) => HEADINGS_IN_ORDER.includes(title));
  return wanted.join("|") === HEADINGS_IN_ORDER.join("|");
}

function namesEveryMode(folder: string): boolean {
  const body = simplified(sectionBody(folder, "failure modes"));
  return failureModeNames(folder).every((mode) => body.includes(simplified(mode)));
}

// Each criteria row shows up on one line, with its mode name and the same threshold number.
function thresholdsMatchCriteria(folder: string): boolean {
  const lines = sectionBody(folder, "metrics and thresholds").split("\n");
  return criteriaIn(folder).every((criterion) => {
    const mode = simplified(criterion.mode);
    const limit = firstNumberIn(criterion.threshold);
    const line = lines.find((candidate) => simplified(candidate).includes(mode));
    const sameNumber = new RegExp(`(^|[^\\d.])${limit}(?![\\d.]*\\d)`);
    return line !== undefined && sameNumber.test(line);
  });
}

function goldenSetIsDescribed(folder: string): boolean {
  const body = sectionBody(folder, "golden set");
  const sizeIsEnough = firstNumberIn(sameLineAfter(body, "Size")) >= 30;
  const hasOwner = wordCount(sameLineAfter(body, "Owner")) >= 1;
  const hasRefresh = wordCount(sameLineAfter(body, "Refresh when")) >= 4;
  return sizeIsEnough && hasOwner && hasRefresh;
}

function judgesHaveRates(folder: string): boolean {
  const body = sectionBody(folder, "judges");
  const tpr = firstNumberIn(sameLineAfter(body, "TPR"));
  const tnr = firstNumberIn(sameLineAfter(body, "TNR"));
  return !Number.isNaN(tpr) && !Number.isNaN(tnr);
}

function launchRuleNamesCriticalModes(folder: string): boolean {
  const body = simplified(sectionBody(folder, "launch rule"));
  const critical = criteriaIn(folder).filter(isCritical);
  return critical.length > 0 && critical.every((row) => body.includes(simplified(row.mode)));
}

export default [
  {
    says: "launch-criteria.md and failure-modes.md are here and pass set-launch-criteria",
    test: (folder) => safely(() => criteriaRules.every((rule) => rule.test(folder) === true)),
    tryNext: "keep the starter files, or copy in your own from set-launch-criteria",
  },
  {
    says: "prd-eval-section.md has the seven ## headings, in order",
    test: (folder) =>
      safely(() => hasFile(folder, "prd-eval-section.md") && headingsAreInOrder(folder)),
    tryNext:
      "keep the starter headings: User outcome, Failure modes, Metrics and thresholds, " +
      "Golden set, Judges, Launch rule, After launch",
  },
  {
    says: "every section has at least 8 words",
    test: (folder) =>
      safely(() =>
        HEADINGS_IN_ORDER.every((heading) => wordCount(sectionBody(folder, heading)) >= 8),
      ),
    tryNext: "fill each empty section with at least one full sentence",
  },
  {
    says: "Failure modes names every mode in failure-modes.md",
    test: (folder) => safely(() => namesEveryMode(folder)),
    tryNext: "list each ## heading of failure-modes.md, spelled the same",
  },
  {
    says: "Metrics and thresholds gives each mode the same threshold as launch-criteria.md",
    test: (folder) => safely(() => thresholdsMatchCriteria(folder)),
    tryNext:
      "write one line per mode with its name and its number, like: " +
      "Ignores mobility needs: at most 1 fail in 150",
  },
  {
    says: "Golden set has Size: (30 or more), Owner: and Refresh when: lines",
    test: (folder) => safely(() => goldenSetIsDescribed(folder)),
    tryNext: "add three lines, like Size: 40, Owner: Ines Duarte, Refresh when: a new mode appears",
  },
  {
    says: "Judges states a TPR: and a TNR: for the judge you trust",
    test: (folder) => safely(() => judgesHaveRates(folder)),
    tryNext: "copy TPR and TNR for the mobility judge from your judge-check.md",
  },
  {
    says: "Launch rule names every critical mode",
    test: (folder) => safely(() => launchRuleNamesCriticalModes(folder)),
    tryNext: "say that each critical mode blocks a launch on its own, and name each one",
  },
] satisfies Rule[];
