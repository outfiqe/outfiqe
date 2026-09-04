import { defineConfig, devices } from "@playwright/test";

const PREVIEW_PORT = 3100;

const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

const SERVER_BOOT_TIMEOUT_MS = 180_000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: PREVIEW_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next start --port ${PREVIEW_PORT}`,
    url: PREVIEW_URL,
    reuseExistingServer: !process.env.CI,
    timeout: SERVER_BOOT_TIMEOUT_MS,
    env: {
      NEXT_PUBLIC_PWA_ENABLED: "true",
      API_URL: process.env.API_URL ?? "http://127.0.0.1:4000",
      ADMIN_ORIGIN_URL: process.env.ADMIN_ORIGIN_URL ?? "http://127.0.0.1:5173",
      SITE_URL: PREVIEW_URL,
    },
  },
});
