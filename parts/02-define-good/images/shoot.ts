// bun parts/02-define-good/images/shoot.ts: captures the picture this part's pages show,
// from the real viewer. Uses Playwright's Chromium. If yours is elsewhere, set CHROME_PATH.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = join(import.meta.dir, "..", "..", "..");
const VIEWER = pathToFileURL(join(ROOT, "world", "viewer.html")).href;
const PICTURE = "parts/02-define-good/02-label-the-golden-set/images/expected.png";

let launchOptions = {};
if (process.env.CHROME_PATH) launchOptions = { executablePath: process.env.CHROME_PATH };
const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({
  viewport: { width: 1200, height: 860 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
// T135 is a golden draft with the borderline case: some steps, and limited walking.
await page.goto(`${VIEWER}#read/T135`);
await page.screenshot({ path: join(ROOT, PICTURE), fullPage: true });
await browser.close();
console.log(`  wrote ${PICTURE}`);
