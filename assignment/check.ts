// bun assignment/check.ts [folder]: tests every Done-when line and writes assignment/result.json.
// The grader reruns this same script on the learner's branch.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import rules, {
  changedLabels,
  exportRows,
  passRate,
  spreadsheetRows,
  toolVersion,
} from "../checks/label-the-queue-rows";

const folder = process.argv[2] ?? import.meta.dir;

async function outcomeOf(rule: (typeof rules)[number]): Promise<"pass" | "fail"> {
  const holds = await rule.test(folder);
  return holds ? "pass" : "fail";
}

function rateOrNull(read: () => Record<string, string>[]): number | null {
  try {
    return Math.round(passRate(read()) * 1000) / 1000;
  } catch {
    return null;
  }
}

const doneWhen = [];
for (const rule of rules) doneWhen.push({ line: rule.says, result: await outcomeOf(rule) });
const everyLinePasses = doneWhen.every((entry) => entry.result === "pass");

const result = {
  doneWhen,
  langfuseVersion: toolVersion(folder),
  // For the person who reads the rubric: these are not Done-when lines.
  passRateInQueue: rateOrNull(() => exportRows(folder)),
  passRateInSpreadsheet: rateOrNull(() => spreadsheetRows(folder)),
  changedLabels: everyLinePasses ? changedLabels(folder) : [],
};
writeFileSync(join(folder, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
for (const entry of doneWhen) console.log(`  ${entry.result.toUpperCase()}  ${entry.line}`);
console.log(`Wrote ${join(folder === import.meta.dir ? "assignment" : folder, "result.json")}.`);
process.exit(everyLinePasses ? 0 : 1);
