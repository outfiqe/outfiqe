import { execSync, spawn } from "node:child_process";

import { expect, test } from "@playwright/test";

const OFFLINE_PREVIEW_PORT = 3114;

const OFFLINE_PREVIEW_URL = `http://127.0.0.1:${OFFLINE_PREVIEW_PORT}`;

const SERVER_READY_ATTEMPTS = 90;

const SERVER_POLL_INTERVAL_MS = 1000;

const SERVER_SHUTDOWN_GRACE_MS = 3000;

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60_000;

const startPreviewServer = () =>
  spawn(
    process.execPath,
    ["./node_modules/next/dist/bin/next", "start", "--port", String(OFFLINE_PREVIEW_PORT)],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_PWA_ENABLED: "true",
        API_URL: process.env.API_URL ?? "http://127.0.0.1:4000",
        ADMIN_ORIGIN_URL: process.env.ADMIN_ORIGIN_URL ?? "http://127.0.0.1:5173",
        SITE_URL: OFFLINE_PREVIEW_URL,
      },
      stdio: "ignore",
    },
  );

const waitUntilPreviewServerAnswers = async () => {
  for (let attempt = 0; attempt < SERVER_READY_ATTEMPTS; attempt += 1) {
    try {
      if ((await fetch(`${OFFLINE_PREVIEW_URL}/offline`)).ok) return true;
    } catch {
      /* server not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, SERVER_POLL_INTERVAL_MS));
  }
  return false;
};

const killWhateverListensOnPreviewPort = () => {
  const killByPort =
    process.platform === "win32"
      ? `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${OFFLINE_PREVIEW_PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"`
      : `fuser -k ${OFFLINE_PREVIEW_PORT}/tcp`;

  try {
    execSync(killByPort, { stdio: "ignore" });
  } catch {
    /* nothing was listening */
  }
};

test.describe("offline fallback", () => {
  test("serves saved pages and the offline page once the network is genuinely gone", async ({
    page,
  }) => {
    test.slow();

    const previewServer = startPreviewServer();

    try {
      expect(await waitUntilPreviewServerAnswers()).toBe(true);

      await page.goto(`${OFFLINE_PREVIEW_URL}/offline`);
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
        timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
      });

      await page.goto(`${OFFLINE_PREVIEW_URL}/about`, { waitUntil: "load" });

      previewServer.kill();
      killWhateverListensOnPreviewPort();
      await new Promise((resolve) => setTimeout(resolve, SERVER_SHUTDOWN_GRACE_MS));

      await page.goto(`${OFFLINE_PREVIEW_URL}/a-page-that-was-never-visited`, {
        waitUntil: "commit",
      });
      await expect(page.getByRole("heading", { name: /you're offline/i })).toBeVisible();

      await page.goto(`${OFFLINE_PREVIEW_URL}/about`, { waitUntil: "commit" });
      await expect(page.getByRole("heading", { name: /you're offline/i })).toHaveCount(0);
    } finally {
      previewServer.kill();
      killWhateverListensOnPreviewPort();
    }
  });
});
