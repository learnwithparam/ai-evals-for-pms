// bun run shots: captures every picture the pages show, from the real viewer and real command output.
// Uses Playwright's Chromium. If yours is elsewhere, set CHROME_PATH.
import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dir, "..");
const viewer = pathToFileURL(join(ROOT, "world", "viewer.html")).href;
const fallback = ["/opt/pw-browsers/chromium-1243/chrome-linux/chrome", "/opt/pw-browsers/chromium"].find((p) => existsSync(p));
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}).catch(() => chromium.launch({ executablePath: fallback }));
const ctx = await browser.newContext({ viewport: { width: 1200, height: 860 }, deviceScaleFactor: 2, colorScheme: "light" });

async function shotViewer(hash: string, out: string, prep?: (p: import("playwright").Page) => Promise<void>) {
  const p = await ctx.newPage();
  await p.goto(`${viewer}#${hash}`);
  if (prep) await prep(p);
  await p.screenshot({ path: join(ROOT, out), fullPage: hash.startsWith("read") });
  await p.close();
  console.log(`  wrote ${out}`);
}

async function shotTerminal(cmd: string[], title: string, out: string) {
  const r = Bun.spawnSync(cmd, { cwd: ROOT, env: { ...process.env, LLM_PROVIDER: "replay" } });
  const text = (r.stdout.toString() + r.stderr.toString()).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0d1117">
  <div style="width:800px;padding:0;font:14px/1.45 ui-monospace,Menlo,Consolas,monospace;color:#e6edf3;background:#0d1117">
  <div style="padding:8px 14px;background:#161b22;color:#8b949e;border-bottom:1px solid #30363d">${title}</div>
  <pre style="margin:0;padding:14px;white-space:pre-wrap">$ ${title}\n${text}</pre></div>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 800, height: 400 });
  await p.setContent(html);
  await p.locator("body > div").screenshot({ path: join(ROOT, out) });
  await p.close();
  console.log(`  wrote ${out}`);
}

const P1 = "parts/01-look-before-you-measure";
const typeNote = (id: string, note: string) => async (p: import("playwright").Page) => {
  await p.evaluate(([k, v]) => localStorage.setItem(k, v), [`lantern-note-${id}`, note]);
  await p.goto(`${viewer}#meet`);
  await p.goto(`${viewer}#read/${id}`);
};
await shotViewer("meet", "00-orientation/meet-lantern-trails/images/expected.png");
await shotViewer("read/T020", `${P1}/01-read-the-traces/images/expected.png`, typeNote("T020", "Books Lagos Hilltop Lanes Walk, which has steep steps, for a traveller with a wheelchair."));
await shotViewer("read/T020", "images/viewer.png", typeNote("T020", "Books Lagos Hilltop Lanes Walk, which has steep steps, for a traveller with a wheelchair."));
await shotViewer("chart", `${P1}/03-count-the-failures/images/expected.png`, async (p) => {
  await p.evaluate((t) => (window as any).drawCounts(t), readFileSync(join(ROOT, P1, "03-count-the-failures/solution/counts.csv"), "utf8"));
});
await shotTerminal(["bun", "run", "--silent", "finished"], "bun run finished", "images/finished-system.png");
await browser.close();
