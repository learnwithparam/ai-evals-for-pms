// bun run finished: the finished system, end to end, with no key.
// 1. Draft Planner writes a draft in replay mode. 2. Every built step's check runs on its sample answer.
// 3. The sample counts print as a bar chart, the first page of the launch pack.
import { join } from "node:path";
import { readCsv } from "./world";
import { runDraft } from "./draft-planner";
import { allSteps, ROOT } from "../scripts/structure";
import { requestText } from "./format";

process.env.LLM_PROVIDER = process.env.LLM_PROVIDER ?? "replay";
const { trace, text, run } = await runDraft("R020");
console.log("1. Draft Planner writes a draft");
console.log(requestText(trace).split("\n").map((l) => "   " + l).join("\n"));
console.log(text.split("\n").slice(0, 6).map((l) => "   " + l).join("\n") + "\n   ...");
console.log(`   Provider: ${run.provider}. Logged to world/logs/runs.jsonl.\n`);

console.log("2. Each step's check runs on the sample answer");
let pass = 0;
const steps = allSteps();
for (const s of steps) {
  const p = Bun.spawnSync(["bun", join(ROOT, "scripts", "verify.ts"), s.name, "solution"], { cwd: ROOT });
  const ok = p.exitCode === 0;
  if (ok) pass++;
  console.log(`   ${ok ? "PASS" : "FAIL"}  ${s.name}`);
}

console.log("\n3. What goes wrong, counted (sample answer for 30 drafts)");
const counts = readCsv(join(ROOT, "parts", "01-look-before-you-measure", "03-count-the-failures", "solution", "counts.csv"));
const w = Math.max(...counts.map((c) => c.mode.length));
for (const c of counts) console.log(`   ${c.mode.padEnd(w)}  ${"#".repeat(Number(c.count) * 4)} ${c.count}`);
console.log(`\nThe finished work passes: ${pass} of ${steps.length} steps.`);
process.exit(pass === steps.length ? 0 : 1);
