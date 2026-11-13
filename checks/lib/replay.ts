// Starts the learner's system in replay mode and reads what it logged. Anything that depends on a
// model is judged over three fresh runs, so one lucky run never passes.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LOGS } from "../../world/world";

type LoggedRun = { run_id: string; provider: string };

function loggedRuns(): LoggedRun[] {
  const logFile = join(LOGS, "runs.jsonl");
  if (!existsSync(logFile)) return [];
  const lines = readFileSync(logFile, "utf8").trim().split("\n");
  return lines.map((line) => JSON.parse(line));
}

// Returns the run ids, or undefined as soon as one draft comes back without its total.
async function runDraftsInReplay(requestId: string, runs: number): Promise<string[] | undefined> {
  const { runDraft } = await import("../../world/draft-planner");
  const runIds: string[] = [];
  for (let i = 0; i < runs; i++) {
    const draft = await runDraft(requestId);
    if (!draft.text.includes("Total:")) return undefined;
    runIds.push(draft.run.run_id);
  }
  return runIds;
}

export async function draftPlannerRunsInReplay(requestId = "R001", runs = 3): Promise<boolean> {
  const providerBefore = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "replay";
  try {
    const runIds = await runDraftsInReplay(requestId, runs);
    if (!runIds) return false;
    const logged = loggedRuns();
    if (logged.length === 0) return false;
    const wasLoggedInReplay = (runId: string) =>
      logged.some((run) => run.run_id === runId && run.provider === "replay");
    return runIds.every(wasLoggedInReplay);
  } finally {
    // Put the learner's own setting back, so the check never changes their shell.
    if (providerBefore === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = providerBefore;
  }
}
