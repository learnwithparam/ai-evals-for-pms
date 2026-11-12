// bun run world         check the world is in place and say what is in it
// bun run world reset   rebuild every world file from the seed and clear the run log
import { rmSync } from "node:fs";
import { writeWorld } from "./generate";
import { catalogue, dataCsv, LOGS, planted, traces, worldExists } from "./world";

const arg = process.argv[2];
if (arg === "reset") {
  writeWorld();
  rmSync(LOGS, { recursive: true, force: true });
  console.log("Reset the world from its seed and cleared world/logs.");
} else if (arg) {
  console.log(`Unknown option "${arg}". Use: bun run world, or bun run world reset.`);
  process.exit(1);
}
if (!worldExists()) {
  console.log("The world files are missing. Run: bun run world reset");
  process.exit(1);
}
const t = traces().length,
  c = catalogue().length,
  r = dataCsv("requests.csv").length;
const bad = planted().filter((p) => p.mode !== "none").length;
console.log(`Lantern Trails is ready: ${t} traces, ${c} catalogue items, ${r} requests.`);
console.log(
  `Designers rewrote or edited ${traces().filter((x) => x.outcome !== "sent unchanged").length} of ${t} drafts. Nobody has counted why yet.`,
);
if (t !== 300 || c !== 220 || bad === 0) {
  console.log("The counts are wrong. Run: bun run world reset");
  process.exit(1);
}
