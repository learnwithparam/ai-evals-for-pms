// From a fresh clone with no key, every command in the root README and the orientation prints its
// Expect: line.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const API_KEY_VARIABLES = ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"];

type CommandBlock = { command: string; expectLine: string };

function firstLineWithText(lines: string[]): string {
  return lines.find((line) => line.trim() !== "") ?? "";
}

function commandBlocks(file: string): CommandBlock[] {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  const blocks: CommandBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "```bash") continue;
    let j = i + 1;
    const commandLines: string[] = [];
    while (lines[j].trim() !== "```") {
      commandLines.push(lines[j]);
      j++;
    }
    const expectLine = firstLineWithText(lines.slice(j + 1));
    blocks.push({ command: commandLines.join(" && "), expectLine });
    i = j;
  }
  return blocks;
}

// Runs in replay mode with every API key removed, the way a learner starts.
function runWithNoKey(command: string) {
  const environment = { ...process.env } as Record<string, string>;
  environment.LLM_PROVIDER = "replay";
  for (const keyVariable of API_KEY_VARIABLES) delete environment[keyVariable];
  return Bun.spawnSync(["bash", "-c", command], { cwd: ROOT, env: environment });
}

for (const file of ["README.md", "00-orientation/README.md"]) {
  for (const block of commandBlocks(file)) {
    test(`${file}: ${block.command}`, () => {
      const result = runWithNoKey(block.command);
      const output = result.stdout.toString() + result.stderr.toString();
      const expectedText = block.expectLine.match(/`([^`]+)`/)?.[1] ?? "";
      if (/ends with no errors/.test(block.expectLine)) expect(result.exitCode).toBe(0);
      else expect(output).toContain(expectedText);
    }, 60000);
  }
}
