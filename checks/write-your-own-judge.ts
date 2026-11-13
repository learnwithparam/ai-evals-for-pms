import type { Rule } from "../scripts/verify";
import { csvIn, hasFile, safely, wordCount } from "./lib/files";
import { dataCsv } from "./lib/world";

const COLUMNS_IN_ORDER = ["trace_id", "critique", "verdict"];
const LOWEST_RATE = 0.8;

type Verdict = { trace_id: string; critique: string; verdict: string };

const verdictsIn = (folder: string) => csvIn(folder, "my-judge-verdicts.csv") as Verdict[];
const devIds = () => new Set(dataCsv("splits/dev.csv").map((row) => row.trace_id));

function columnsInOrder(folder: string): boolean {
  const columns = Object.keys(verdictsIn(folder)[0]);
  return COLUMNS_IN_ORDER.every((column, i) => columns[i] === column);
}

function fortyDevDrafts(folder: string): boolean {
  const ids = verdictsIn(folder).map((row) => row.trace_id.toUpperCase());
  const dev = devIds();
  const eachIdOnce = new Set(ids).size === ids.length;
  return ids.length === 40 && eachIdOnce && ids.every((id) => dev.has(id));
}

// The share of Ines's labels the judge matched, for one of her labels.
function agreementOn(folder: string, inesLabel: string): number {
  const inesSays = new Map(dataCsv("expert-labels.csv").map((row) => [row.trace_id, row.label]));
  const verdicts = verdictsIn(folder);
  const sameLabel = verdicts.filter(
    (row) => inesSays.get(row.trace_id.toUpperCase()) === inesLabel,
  );
  const judgeAgrees = sameLabel.filter((row) => row.verdict.toLowerCase() === inesLabel);
  if (sameLabel.length === 0) return 0;
  return judgeAgrees.length / sameLabel.length;
}

export default [
  {
    says: "my-judge-verdicts.csv has the columns trace_id, critique, verdict, in that order",
    test: (folder) =>
      safely(() => hasFile(folder, "my-judge-verdicts.csv") && columnsInOrder(folder)),
    tryNext:
      "keep the first row of the starter: trace_id,critique,verdict; the critique comes first",
  },
  {
    says: "it has 40 rows, each a different draft from world/data/splits/dev.csv",
    test: (folder) => safely(() => fortyDevDrafts(folder)),
    tryNext: "keep the 40 ids in the starter; they all come from the dev split",
  },
  {
    says: "every verdict is pass or fail",
    test: (folder) =>
      safely(() =>
        verdictsIn(folder).every((row) => ["pass", "fail"].includes(row.verdict.toLowerCase())),
      ),
    tryNext: "ask your judge to answer with the single word pass or fail, then fill any gaps",
  },
  {
    says: "every critique has at least 6 words",
    test: (folder) => safely(() => verdictsIn(folder).every((row) => wordCount(row.critique) >= 6)),
    tryNext: "ask your judge for a critique that names the stop and its Access line",
  },
  {
    says: "TPR against Ines is 0.80 or more",
    test: (folder) => safely(() => agreementOn(folder, "pass") >= LOWEST_RATE),
    tryNext:
      "your judge fails too many good drafts; add a pass example from train and run it again",
  },
  {
    says: "TNR against Ines is 0.80 or more",
    test: (folder) => safely(() => agreementOn(folder, "fail") >= LOWEST_RATE),
    tryNext:
      "your judge passes too many bad drafts; make the Fail text plainer, add a fail example, " +
      "and run it again",
  },
] satisfies Rule[];
