// Starts the learner's system in replay mode and reads what it logged. Anything that depends on a model
// is judged over three fresh runs, so one lucky run never passes.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LOGS } from "../../world/world";

export async function draftPlannerRunsInReplay(requestId = "R001", runs = 3): Promise<boolean> {
  const before = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "replay";
  try {
    const { runDraft } = await import("../../world/draft-planner");
    const ids: string[] = [];
    for (let i = 0; i < runs; i++) {
      const r = await runDraft(requestId);
      if (!r.text.includes("Total:")) return false;
      ids.push(r.run.run_id);
    }
    const log = join(LOGS, "runs.jsonl");
    if (!existsSync(log)) return false;
    const logged = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    return ids.every((id) => logged.some((l) => l.run_id === id && l.provider === "replay"));
  } finally {
    if (before === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = before;
  }
}
