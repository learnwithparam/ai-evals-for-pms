// Reads the Lantern Trails world. Checks, the CLI and the Draft Planner all ask this file.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import type { Item, Trace } from "./generate";

export const WORLD = import.meta.dir;
export const DATA = join(WORLD, "data");
export const LOGS = join(WORLD, "logs");

const BYTE_ORDER_MARK = /^\uFEFF/;

type PlantedRow = { trace_id: string; set: string; mode: string; detail: string };

// Trims every cell, so a stray space from a spreadsheet never changes an answer.
function trimmedRow(row: Record<string, string>): Record<string, string> {
  const cells = Object.entries(row);
  const trimmedCells = cells.map(([column, cell]) => [column, (cell ?? "").toString().trim()]);
  return Object.fromEntries(trimmedCells);
}

export function readCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, "utf8").replace(BYTE_ORDER_MARK, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  return parsed.data.map(trimmedRow);
}

export const dataCsv = (fileName: string) => readCsv(join(DATA, fileName));

export function worldExists(): boolean {
  return existsSync(join(DATA, "traces.jsonl")) && existsSync(join(DATA, "catalogue.csv"));
}

// The traces file is large, so we read it once and keep it.
let savedTraces: Trace[] | null = null;

export function traces(): Trace[] {
  if (savedTraces === null) {
    const lines = readFileSync(join(DATA, "traces.jsonl"), "utf8").trim().split("\n");
    savedTraces = lines.map((line) => JSON.parse(line));
  }
  return savedTraces;
}

export const catalogue = () => dataCsv("catalogue.csv") as unknown as Item[];
export const planted = () => dataCsv("planted.csv") as PlantedRow[];
export const sampleIds = () => dataCsv("sample-30.csv").map((row) => row.trace_id);
