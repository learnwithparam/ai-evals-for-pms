// bun run finished: the finished system, end to end, with no key.
// 1. Draft Planner writes a draft in replay mode.
// 2. Every built step's check runs on its sample answer.
// 3. The sample counts print as a bar chart, the first page of the launch pack.
import { join } from "node:path";
import { allSteps, ROOT } from "../scripts/structure";
import { runDraft } from "./draft-planner";
import { requestText } from "./format";
import { readCsv } from "./world";

const SAMPLE_COUNTS = join(
  ROOT,
  "parts",
  "01-look-before-you-measure",
  "03-count-the-failures",
  "solution",
  "counts.csv",
);

function indented(text: string): string {
  const lines = text.split("\n");
  return lines.map((line) => `   ${line}`).join("\n");
}

async function showOneDraft() {
  const { trace, text, run } = await runDraft("R020");
  console.log("1. Draft Planner writes a draft");
  console.log(indented(requestText(trace)));
  // The first six lines are enough to show the shape of a draft.
  const firstLines = text.split("\n").slice(0, 6).join("\n");
  console.log(`${indented(firstLines)}\n   ...`);
  console.log(`   Provider: ${run.provider}. Logged to world/logs/runs.jsonl.\n`);
}

// Returns how many steps pass on their sample answer.
function runEveryCheck(): number {
  console.log("2. Each step's check runs on the sample answer");
  let passed = 0;
  for (const step of allSteps()) {
    const command = ["bun", join(ROOT, "scripts", "verify.ts"), step.name, "solution"];
    const result = Bun.spawnSync(command, { cwd: ROOT });
    const stepPassed = result.exitCode === 0;
    if (stepPassed) passed++;
    console.log(`   ${stepPassed ? "PASS" : "FAIL"}  ${step.name}`);
  }
  return passed;
}

function drawCountsChart() {
  console.log("\n3. What goes wrong, counted (sample answer for 30 drafts)");
  const counts = readCsv(SAMPLE_COUNTS);
  const widestName = Math.max(...counts.map((row) => row.mode.length));
  for (const row of counts) {
    const bar = "#".repeat(Number(row.count) * 4);
    console.log(`   ${row.mode.padEnd(widestName)}  ${bar} ${row.count}`);
  }
}

process.env.LLM_PROVIDER = process.env.LLM_PROVIDER ?? "replay";
await showOneDraft();
const passed = runEveryCheck();
drawCountsChart();
const stepCount = allSteps().length;
console.log(`\nThe finished work passes: ${passed} of ${stepCount} steps.`);
process.exit(passed === stepCount ? 0 : 1);
