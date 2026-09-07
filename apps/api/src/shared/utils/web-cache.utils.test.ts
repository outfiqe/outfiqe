import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, warn } = vi.hoisted(() => ({
  mockEnv: {
    FRONTEND_URL: "https://web.test",
    WEB_REVALIDATE_SECRET: "revalidate-secret" as string | undefined,
  },
  warn: vi.fn(),
}));

vi.mock("#config/env.config.js", () => ({ env: mockEnv }));
vi.mock("#lib/winston.utils.js", () => ({ default: { warn, error: vi.fn(), info: vi.fn() } }));

import { revalidateWebCache } from "#lib/web-cache.utils.js";

beforeEach(() => {
  mockEnv.WEB_REVALIDATE_SECRET = "revalidate-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("revalidateWebCache", () => {
  it("does nothing when there are no tags", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await revalidateWebCache([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when no secret is configured", async () => {
    mockEnv.WEB_REVALIDATE_SECRET = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await revalidateWebCache(["categories"]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the tags to the web revalidate endpoint with the bearer secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await revalidateWebCache(["categories", "hero-slides"]);

    expect(fetchMock).toHaveBeenCalledWith("https://web.test/internal/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer revalidate-secret",
      },
      body: JSON.stringify({ tags: ["categories", "hero-slides"] }),
    });
  });

  it("logs and does not throw on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(revalidateWebCache(["categories"])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("logs and does not throw when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    await expect(revalidateWebCache(["categories"])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
