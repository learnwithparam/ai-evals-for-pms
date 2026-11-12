// bun run models: one tiny call per role on the chosen provider. Prints the provider, role, pass or fail
// and the cost. It never prints a key or a model name.
import { complete } from "./llm";
import { provider, type Role } from "./models";

let bad = 0;
let p: string;
try { p = provider(); } catch (e) { console.log((e as Error).message); process.exit(2); }
console.log(`Provider: ${p}`);
for (const role of ["fast", "smart", "judge"] as Role[]) {
  try {
    const r = await complete(role, "Reply with the single word: ok", "ok");
    const ok = /\bok\b/i.test(r.text);
    if (!ok) bad++;
    const cost = r.costUsd === null ? `${r.inputTokens + r.outputTokens} tokens` : `${r.costUsd.toFixed(6)} USD`;
    console.log(`  ${role.padEnd(6)} ${ok ? "pass" : "fail"}  cost ${cost}`);
  } catch (e) {
    bad++;
    console.log(`  ${role.padEnd(6)} fail  ${(e as Error).message}`);
  }
}
console.log(bad ? `${bad} role(s) failed.` : "Every role answers.");
process.exit(bad ? 1 : 0);
