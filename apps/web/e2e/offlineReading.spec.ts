import { execSync, spawn } from "node:child_process";

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const PREVIEW_PORT = 3115;

const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

const SERVER_READY_ATTEMPTS = 90;

const SERVER_POLL_INTERVAL_MS = 1000;

const SERVER_SHUTDOWN_GRACE_MS = 3000;

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60_000;

const PERSISTED_QUERY_CACHE_KEY = "outfiqe-offline-reading";

const PERSISTED_CACHE_VERSION = "1";

const startPreviewServer = () =>
  spawn(
    process.execPath,
    ["./node_modules/next/dist/bin/next", "start", "--port", String(PREVIEW_PORT)],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_PWA_ENABLED: "true",
        API_URL: process.env.API_URL ?? "http://127.0.0.1:4000",
        ADMIN_ORIGIN_URL: process.env.ADMIN_ORIGIN_URL ?? "http://127.0.0.1:5173",
        SITE_URL: PREVIEW_URL,
      },
      stdio: "ignore",
    },
  );

const waitUntilPreviewServerAnswers = async () => {
  for (let attempt = 0; attempt < SERVER_READY_ATTEMPTS; attempt += 1) {
    try {
      if ((await fetch(`${PREVIEW_URL}/offline`)).ok) return true;
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
      ? `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PREVIEW_PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"`
      : `fuser -k ${PREVIEW_PORT}/tcp`;

  try {
    execSync(killByPort, { stdio: "ignore" });
  } catch {
    /* nothing was listening */
  }
};

type SeededQuery = {
  queryKey: unknown[];
  data: unknown;
};

const seedPersistedQueryCache = (page: Page, queries: SeededQuery[]) =>
  page.evaluate(
    ({ storageKey, buster, seededQueries }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("keyval-store");
        request.onupgradeneeded = () => request.result.createObjectStore("keyval");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const now = Date.now();
          const persistedClient = {
            timestamp: now,
            buster,
            clientState: {
              mutations: [],
              queries: seededQueries.map(({ queryKey, data }) => ({
                queryKey,
                queryHash: JSON.stringify(queryKey),
                state: {
                  data,
                  dataUpdateCount: 1,
                  dataUpdatedAt: now,
                  error: null,
                  errorUpdateCount: 0,
                  errorUpdatedAt: 0,
                  fetchFailureCount: 0,
                  fetchFailureReason: null,
                  fetchMeta: null,
                  isInvalidated: false,
                  status: "success",
                  fetchStatus: "idle",
                },
                dehydratedAt: now,
              })),
            },
          };
          const transaction = db.transaction("keyval", "readwrite");
          transaction.objectStore("keyval").put(persistedClient, storageKey);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    {
      storageKey: PERSISTED_QUERY_CACHE_KEY,
      buster: PERSISTED_CACHE_VERSION,
      seededQueries: queries,
    },
  );

test.describe("offline reading", () => {
  test("restores a previously saved query into the live cache and renders it once the network is genuinely gone", async ({
    page,
  }) => {
    test.slow();

    const previewServer = startPreviewServer();

    try {
      expect(await waitUntilPreviewServerAnswers()).toBe(true);

      await page.goto(`${PREVIEW_URL}/offline`);
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
        timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
      });
      await page.goto(`${PREVIEW_URL}/`, { waitUntil: "load" });

      await seedPersistedQueryCache(page, [
        {
          queryKey: ["categories"],
          data: [
            {
              id: "seeded-category-id",
              slug: "offline-seeded-category",
              name: "Offline Seeded Category",
              imageUrl: null,
              productCount: 0,
            },
          ],
        },
      ]);

      previewServer.kill();
      killWhateverListensOnPreviewPort();
      await new Promise((resolve) => setTimeout(resolve, SERVER_SHUTDOWN_GRACE_MS));

      await page.goto(`${PREVIEW_URL}/`, { waitUntil: "commit" });

      await expect(page.getByRole("button", { name: "Offline Seeded Category" })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      previewServer.kill();
      killWhateverListensOnPreviewPort();
    }
  });

  test("never restores a query that was written to the same store outside the app's own allowlisted save path", async ({
    page,
  }) => {
    test.slow();

    const previewServer = startPreviewServer();

    try {
      expect(await waitUntilPreviewServerAnswers()).toBe(true);

      await page.goto(`${PREVIEW_URL}/offline`);
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
        timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
      });
      await page.goto(`${PREVIEW_URL}/`, { waitUntil: "load" });

      await seedPersistedQueryCache(page, [
        {
          queryKey: ["cart"],
          data: { items: [{ productName: "Should never render offline" }] },
        },
      ]);

      previewServer.kill();
      killWhateverListensOnPreviewPort();
      await new Promise((resolve) => setTimeout(resolve, SERVER_SHUTDOWN_GRACE_MS));

      await page.goto(`${PREVIEW_URL}/`, { waitUntil: "commit" });
      await page.waitForTimeout(2000);

      await expect(page.getByText("Should never render offline")).toHaveCount(0);
    } finally {
      previewServer.kill();
      killWhateverListensOnPreviewPort();
    }
  });
});
