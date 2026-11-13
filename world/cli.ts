// bun run world         check the world is in place and say what is in it
// bun run world reset   rebuild every world file from the seed and clear the run log
import { rmSync } from "node:fs";
import { writeWorld } from "./generate";
import { catalogue, dataCsv, LOGS, planted, traces, worldExists } from "./world";

function resetTheWorld() {
  writeWorld();
  rmSync(LOGS, { recursive: true, force: true });
  console.log("Reset the world from its seed and cleared world/logs.");
}

function describeTheWorld() {
  const traceCount = traces().length;
  const catalogueCount = catalogue().length;
  const requestCount = dataCsv("requests.csv").length;
  const faultyCount = planted().filter((row) => row.mode !== "none").length;
  const changedDrafts = traces().filter((trace) => trace.outcome !== "sent unchanged");
  console.log(
    `Lantern Trails is ready: ${traceCount} traces, ${catalogueCount} catalogue items, ` +
      `${requestCount} requests.`,
  );
  console.log(
    `Designers rewrote or edited ${changedDrafts.length} of ${traceCount} drafts. ` +
      "Nobody has counted why yet.",
  );
  if (traceCount !== 300 || catalogueCount !== 220 || faultyCount === 0) {
    console.log("The counts are wrong. Run: bun run world reset");
    process.exit(1);
  }
}

const option = process.argv[2];
if (option === "reset") {
  resetTheWorld();
} else if (option) {
  console.log(`Unknown option "${option}". Use: bun run world, or bun run world reset.`);
  process.exit(1);
}
if (!worldExists()) {
  console.log("The world files are missing. Run: bun run world reset");
  process.exit(1);
}
describeTheWorld();
