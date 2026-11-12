// Reads the files a learner hands in. Every reader forgives what spreadsheets do to a file:
// a byte-order mark, Windows line ends, quoted cells, extra blank rows, capital letters in headers.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readCsv } from "../../world/world";

export const has = (dir: string, name: string) => existsSync(join(dir, name));
export const csvIn = (dir: string, name: string) => readCsv(join(dir, name));
export const textIn = (dir: string, name: string) =>
  readFileSync(join(dir, name), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");

export const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const isOk = (note: string) => /^ok\.?$/i.test(note.trim());
export const traceIds = (s: string) =>
  [...s.toUpperCase().matchAll(/\bT\d{3}\b/g)].map((m) => m[0]);

// "## Heading" blocks of a Markdown file, with the lines under each.
export function sections(md: string): { title: string; body: string }[] {
  const out: { title: string; body: string }[] = [];
  for (const block of md.split(/^## /m).slice(1)) {
    const [title, ...rest] = block.split("\n");
    out.push({ title: title.trim(), body: rest.join("\n") });
  }
  return out;
}
// The text after "Label:" on its own line, or "" when the line is missing.
export function field(body: string, label: string): string {
  const m = body.match(new RegExp(`^\\s*[-*]?\\s*\\**${label}\\**\\s*:\\s*(.*)$`, "im"));
  return m ? m[1].trim() : "";
}
export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Runs a test and turns any thrown error (a missing file, a bad header) into a plain false.
export const safely = (fn: () => boolean) => {
  try {
    return fn();
  } catch {
    return false;
  }
};
