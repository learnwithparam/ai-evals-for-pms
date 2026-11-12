// bun run models: one tiny call per role on the chosen provider. Prints the provider, role, pass or
// fail and the cost. It never prints a key or a model name.
import { complete, type Reply } from "./llm";
import { provider, type Role } from "./models";

const ROLES: Role[] = ["fast", "smart", "judge"];

function chosenProviderOrExit(): string {
  try {
    return provider();
  } catch (error) {
    console.log((error as Error).message);
    process.exit(2);
  }
}

function costText(reply: Reply): string {
  if (reply.costUsd === null) return `${reply.inputTokens + reply.outputTokens} tokens`;
  return `${reply.costUsd.toFixed(6)} USD`;
}

// Returns true when the role answers "ok".
async function roleAnswers(role: Role): Promise<boolean> {
  try {
    const reply = await complete(role, "Reply with the single word: ok", "ok");
    const answered = /\bok\b/i.test(reply.text);
    const verdict = answered ? "pass" : "fail";
    console.log(`  ${role.padEnd(6)} ${verdict}  cost ${costText(reply)}`);
    return answered;
  } catch (error) {
    console.log(`  ${role.padEnd(6)} fail  ${(error as Error).message}`);
    return false;
  }
}

console.log(`Provider: ${chosenProviderOrExit()}`);
let failedRoles = 0;
for (const role of ROLES) {
  if (!(await roleAnswers(role))) failedRoles++;
}
if (failedRoles > 0) {
  console.log(`${failedRoles} role(s) failed.`);
  process.exit(1);
}
console.log("Every role answers.");
