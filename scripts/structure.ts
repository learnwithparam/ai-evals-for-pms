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

type StepSettings = { minutes?: number; screen?: boolean; solution?: boolean };

function subfolders(folder: string): string[] {
  if (!existsSync(folder)) return [];
  const entries = readdirSync(folder);
  const folders = entries.filter((entry) => statSync(join(folder, entry)).isDirectory());
  return folders.sort();
}

// Folders keep an order prefix for sorting only. Learners never type it.
export const bareName = (folder: string) => folder.replace(/^\d+-/, "");

const hasSettings = (stepFolder: string) => existsSync(join(stepFolder, "step.toml"));

function readSettings(stepFolder: string): StepSettings {
  if (!hasSettings(stepFolder)) return {};
  const settingsPath = join(stepFolder, "step.toml");
  return Bun.TOML.parse(readFileSync(settingsPath, "utf8")) as StepSettings;
}

function loadStep(partFolder: string, partName: string, stepName: string): Step {
  const stepFolder = join(partFolder, stepName);
  const settings = readSettings(stepFolder);
  return {
    name: bareName(stepName),
    dir: stepFolder,
    part: partName,
    meta: {
      minutes: Number(settings.minutes ?? 0),
      screen: Boolean(settings.screen),
      solution: Boolean(settings.solution),
    },
  };
}

// A step folder has a step.toml or an order prefix; other folders (images, notes) are not steps.
function stepsIn(partFolder: string, partName: string): Step[] {
  const stepFolders = subfolders(partFolder).filter(
    (stepName) => hasSettings(join(partFolder, stepName)) || /^\d+-/.test(stepName),
  );
  return stepFolders.map((stepName) => loadStep(partFolder, partName, stepName));
}

// The orientation is the first part when 00-orientation holds a step folder (one with step.toml).
function orientationPart(): Part[] {
  const orientationFolder = join(ROOT, "00-orientation");
  const allOrientationSteps = stepsIn(orientationFolder, "orientation");
  const steps = allOrientationSteps.filter((step) => hasSettings(step.dir));
  if (steps.length === 0) return [];
  return [{ name: "orientation", dir: orientationFolder, steps }];
}

export function parts(): Part[] {
  const partsFolder = join(ROOT, "parts");
  const numberedParts = subfolders(partsFolder).map((folderName) => {
    const partFolder = join(partsFolder, folderName);
    const partName = bareName(folderName);
    return { name: partName, dir: partFolder, steps: stepsIn(partFolder, partName) };
  });
  return [...orientationPart(), ...numberedParts];
}

export const allSteps = () => parts().flatMap((part) => part.steps);

export function findStep(name: string): Step | undefined {
  return allSteps().find((step) => step.name === name);
}
