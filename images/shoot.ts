// bun run shots: captures every picture the pages show, from the real viewer and real command
// output. Uses Playwright's Chromium. If yours is elsewhere, set CHROME_PATH.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { type Browser, chromium, type Page } from "playwright";

const ROOT = join(import.meta.dir, "..");
const VIEWER = pathToFileURL(join(ROOT, "world", "viewer.html")).href;
const PART_ONE = "parts/01-look-before-you-measure";
const WHEELCHAIR_NOTE =
  "Books Lagos Hilltop Lanes Walk, which has steep steps, for a traveller with a wheelchair.";

// Where Chromium lives in the course's cloud machines, used when the default launch fails.
const FALLBACK_CHROME_PATHS = [
  "/opt/pw-browsers/chromium-1243/chrome-linux/chrome",
  "/opt/pw-browsers/chromium",
];

async function launchBrowser(): Promise<Browser> {
  const fallbackPath = FALLBACK_CHROME_PATHS.find((path) => existsSync(path));
  let options = {};
  if (process.env.CHROME_PATH) options = { executablePath: process.env.CHROME_PATH };
  try {
    return await chromium.launch(options);
  } catch {
    return await chromium.launch({ executablePath: fallbackPath });
  }
}

const browser = await launchBrowser();
const browserContext = await browser.newContext({
  viewport: { width: 1200, height: 860 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});

type PreparePage = (page: Page) => Promise<void>;

async function shootViewer(hash: string, outputPath: string, preparePage?: PreparePage) {
  const page = await browserContext.newPage();
  await page.goto(`${VIEWER}#${hash}`);
  if (preparePage) await preparePage(page);
  // The Read tab is long, so it is captured whole.
  const fullPage = hash.startsWith("read");
  await page.screenshot({ path: join(ROOT, outputPath), fullPage });
  await page.close();
  console.log(`  wrote ${outputPath}`);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function terminalHtml(title: string, output: string): string {
  const font = "font:14px/1.45 ui-monospace,Menlo,Consolas,monospace";
  const windowStyle = `width:800px;padding:0;${font};color:#e6edf3;background:#0d1117`;
  const titleStyle =
    "padding:8px 14px;background:#161b22;color:#8b949e;" + "border-bottom:1px solid #30363d";
  return `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0d1117">
  <div style="${windowStyle}">
  <div style="${titleStyle}">${title}</div>
  <pre style="margin:0;padding:14px;white-space:pre-wrap">$ ${title}\n${output}</pre></div>`;
}

async function shootTerminal(command: string[], title: string, outputPath: string) {
  const environment = { ...process.env };
  environment.LLM_PROVIDER = "replay";
  const result = Bun.spawnSync(command, { cwd: ROOT, env: environment });
  const output = escapeHtml(result.stdout.toString() + result.stderr.toString());
  const page = await browserContext.newPage();
  await page.setViewportSize({ width: 800, height: 400 });
  await page.setContent(terminalHtml(title, output));
  await page.locator("body > div").screenshot({ path: join(ROOT, outputPath) });
  await page.close();
  console.log(`  wrote ${outputPath}`);
}

// Saves a note the way the viewer does, then reopens the trace so the note shows.
function withNote(traceId: string, note: string): PreparePage {
  return async (page) => {
    const saveNote = ([key, value]: string[]) => localStorage.setItem(key, value);
    await page.evaluate(saveNote, [`lantern-note-${traceId}`, note]);
    await page.goto(`${VIEWER}#meet`);
    await page.goto(`${VIEWER}#read/${traceId}`);
  };
}

type ViewerWindow = Window & { drawCounts: (csv: string) => void };

async function drawSampleCounts(page: Page) {
  const countsCsv = readFileSync(join(ROOT, PART_ONE, "03-count-the-failures/solution/counts.csv"));
  const drawCounts = (csv: string) => (window as unknown as ViewerWindow).drawCounts(csv);
  await page.evaluate(drawCounts, countsCsv.toString("utf8"));
}

await shootViewer("meet", "00-orientation/meet-lantern-trails/images/expected.png");
const readTheTracesImage = `${PART_ONE}/01-read-the-traces/images/expected.png`;
await shootViewer("read/T020", readTheTracesImage, withNote("T020", WHEELCHAIR_NOTE));
await shootViewer("read/T020", "images/viewer.png", withNote("T020", WHEELCHAIR_NOTE));
const countTheFailuresImage = `${PART_ONE}/03-count-the-failures/images/expected.png`;
await shootViewer("chart", countTheFailuresImage, drawSampleCounts);
await shootTerminal(
  ["bun", "run", "--silent", "finished"],
  "bun run finished",
  "images/finished-system.png",
);
await browser.close();
