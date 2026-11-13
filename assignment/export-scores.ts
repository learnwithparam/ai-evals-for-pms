// bun assignment/export-scores.ts: writes the labels from the queue to assignment/scores-export.csv
// and the Langfuse version to assignment/langfuse-version.txt.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import { callLangfuse, connect, SCORE_NAME } from "./langfuse";

const connection = connect();
const FOLDER = import.meta.dir;

type Score = { traceId: string; stringValue?: string; comment?: string };

async function fetchScores(): Promise<Score[]> {
  const scores: Score[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const path = `/api/public/v2/scores?name=${SCORE_NAME}&limit=100&page=${page}`;
    const { status, json } = await callLangfuse(connection, "GET", path);
    if (status >= 300) {
      console.error(`Langfuse answered ${status}. Try next: check your keys and LANGFUSE_HOST.`);
      process.exit(1);
    }
    scores.push(...((json.data ?? []) as Score[]));
    totalPages = json.meta?.totalPages ?? 1;
    page++;
  }
  return scores;
}

const scores = await fetchScores();
const rows = scores.map((score) => ({
  trace_id: score.traceId,
  label: score.stringValue ?? "",
  comment: score.comment ?? "",
}));
writeFileSync(join(FOLDER, "scores-export.csv"), `${Papa.unparse(rows)}\n`);
const health = await callLangfuse(connection, "GET", "/api/public/health");
writeFileSync(join(FOLDER, "langfuse-version.txt"), `${health.json.version ?? "unknown"}\n`);
console.log(`Wrote assignment/scores-export.csv: ${rows.length} rows.`);
