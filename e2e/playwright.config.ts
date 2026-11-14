// By default Playwright starts e2e/serve.ts, which serves the world folder.
// Set AUDIT_URL and AUDIT_SERVER to point the audit at another app.
import { defineConfig } from "@playwright/test";

const appUrl = process.env.AUDIT_URL ?? "http://localhost:3019";
const startCommand = process.env.AUDIT_SERVER ?? "bun serve.ts 3019";

export default defineConfig({
  testDir: ".",
  testMatch: "text-audit.spec.ts",
  reporter: "list",
  // biome-ignore lint/style/useNamingConvention: baseURL is the name Playwright requires
  use: { baseURL: appUrl, trace: "off" },
  webServer: startCommand
    ? { command: startCommand, url: appUrl, reuseExistingServer: true }
    : undefined,
});
