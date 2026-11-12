// From a fresh clone with no key, every command in the root README and the orientation prints its Expect: line.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const blocks = (file: string) => {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  const out: { cmd: string; expect: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "```bash") continue;
    let j = i + 1;
    const cmd: string[] = [];
    while (lines[j].trim() !== "```") cmd.push(lines[j++]);
    const exp = lines.slice(j + 1).find((l) => l.trim() !== "")!;
    out.push({ cmd: cmd.join(" && "), expect: exp });
    i = j;
  }
  return out;
};

for (const file of ["README.md", "00-orientation/README.md"]) {
  for (const b of blocks(file)) {
    test(`${file}: ${b.cmd}`, () => {
      const env = { ...process.env, LLM_PROVIDER: "replay" } as Record<string, string>;
      for (const k of ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"]) delete env[k];
      const p = Bun.spawnSync(["bash", "-c", b.cmd], { cwd: ROOT, env });
      const out = p.stdout.toString() + p.stderr.toString();
      const first = b.expect.match(/`([^`]+)`/)?.[1] ?? "";
      if (/ends with no errors/.test(b.expect)) expect(p.exitCode).toBe(0);
      else expect(out).toContain(first);
    }, 60000);
  }
}
