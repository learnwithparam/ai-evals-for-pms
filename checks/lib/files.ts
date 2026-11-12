// Reads the files a learner hands in. Every reader forgives what spreadsheets do to a file:
// a byte-order mark, Windows line ends, quoted cells, extra blank rows, capital letters in headers.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readCsv } from "../../world/world";

const BYTE_ORDER_MARK = /^\uFEFF/;

export function hasFile(folder: string, fileName: string): boolean {
  return existsSync(join(folder, fileName));
}

export function csvIn(folder: string, fileName: string): Record<string, string>[] {
  return readCsv(join(folder, fileName));
}

export function textIn(folder: string, fileName: string): string {
  const text = readFileSync(join(folder, fileName), "utf8");
  const withoutMark = text.replace(BYTE_ORDER_MARK, "");
  return withoutMark.replace(/\r\n/g, "\n");
}

export function wordCount(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.filter(Boolean).length;
}

// A note that says only "ok" (or "OK.") means the learner found nothing wrong.
export function isOk(note: string): boolean {
  return /^ok\.?$/i.test(note.trim());
}

// Every trace id in a piece of text, like T020 or t199.
export function traceIdsIn(text: string): string[] {
  const matches = text.toUpperCase().matchAll(/\bT\d{3}\b/g);
  return [...matches].map((match) => match[0]);
}

type Section = { title: string; body: string };

// The "## Heading" blocks of a Markdown file, with the lines under each heading.
export function sections(markdown: string): Section[] {
  const found: Section[] = [];
  const blocks = markdown.split(/^## /m).slice(1);
  for (const block of blocks) {
    const [title, ...bodyLines] = block.split("\n");
    found.push({ title: title.trim(), body: bodyLines.join("\n") });
  }
  return found;
}

// The text after "Label:" on its own line, or "" when the line is missing.
export function field(body: string, label: string): string {
  const labelLine = new RegExp(`^\\s*[-*]?\\s*\\**${label}\\**\\s*:\\s*(.*)$`, "im");
  const match = body.match(labelLine);
  if (!match) return "";
  return match[1].trim();
}

// Lower case, letters and digits only, single spaces: so "Closed on the day!" matches
// "closed on the day".
export function simplified(text: string): string {
  const lowerCase = text.toLowerCase();
  const lettersAndDigits = lowerCase.replace(/[^a-z0-9 ]+/g, " ");
  return lettersAndDigits.replace(/\s+/g, " ").trim();
}

// Runs a test and turns any thrown error (a missing file, a bad header) into a plain false.
export function safely(test: () => boolean): boolean {
  try {
    return test();
  } catch {
    return false;
  }
}
