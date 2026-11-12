// Reads the Lantern Trails world. Checks, the CLI and the Draft Planner all ask this file.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import type { Item, Trace } from "./generate";

export const WORLD = import.meta.dir;
export const DATA = join(WORLD, "data");
export const LOGS = join(WORLD, "logs");

export function readCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const r = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase() });
  return r.data.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, (v ?? "").toString().trim()])));
}
export const dataCsv = (name: string) => readCsv(join(DATA, name));
export const worldExists = () => existsSync(join(DATA, "traces.jsonl")) && existsSync(join(DATA, "catalogue.csv"));

let cache: Trace[] | null = null;
export function traces(): Trace[] {
  cache ??= readFileSync(join(DATA, "traces.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  return cache;
}
export const catalogue = () => dataCsv("catalogue.csv") as unknown as Item[];
export const planted = () => dataCsv("planted.csv") as { trace_id: string; set: string; mode: string; detail: string }[];
export const sampleIds = () => dataCsv("sample-30.csv").map((r) => r.trace_id);
