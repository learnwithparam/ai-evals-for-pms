// Reads the repo layout once. Every other script asks this file where things are.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..");

export type Step = {
  name: string; // verb-the-thing, also the command argument
  dir: string;
  part: string;
  meta: { minutes: number; screen: boolean; solution: boolean };
};
export type Part = { name: string; dir: string; steps: Step[] };

const dirs = (p: string) =>
  existsSync(p)
    ? readdirSync(p)
        .filter((d) => statSync(join(p, d)).isDirectory())
        .sort()
    : [];

// Folders keep an order prefix for sorting only. Learners never type it.
export const bareName = (folder: string) => folder.replace(/^\d+-/, "");

function stepsIn(dir: string, part: string): Step[] {
  return dirs(dir)
    .filter((s) => existsSync(join(dir, s, "step.toml")) || /^\d+-/.test(s))
    .map((s) => {
      const sdir = join(dir, s);
      const metaPath = join(sdir, "step.toml");
      const raw = existsSync(metaPath)
        ? (Bun.TOML.parse(readFileSync(metaPath, "utf8")) as any)
        : {};
      return {
        name: bareName(s),
        dir: sdir,
        part,
        meta: {
          minutes: Number(raw.minutes ?? 0),
          screen: Boolean(raw.screen),
          solution: Boolean(raw.solution),
        },
      };
    });
}

// The orientation is the first part when 00-orientation holds a step folder (one with step.toml).
export function parts(): Part[] {
  const out: Part[] = [];
  const orientation = join(ROOT, "00-orientation");
  const first = stepsIn(orientation, "orientation").filter((s) =>
    existsSync(join(s.dir, "step.toml")),
  );
  if (first.length) out.push({ name: "orientation", dir: orientation, steps: first });
  const root = join(ROOT, "parts");
  for (const p of dirs(root))
    out.push({ name: bareName(p), dir: join(root, p), steps: stepsIn(join(root, p), bareName(p)) });
  return out;
}

export const allSteps = () => parts().flatMap((p) => p.steps);

export function findStep(name: string): Step | undefined {
  return allSteps().find((s) => s.name === name);
}
