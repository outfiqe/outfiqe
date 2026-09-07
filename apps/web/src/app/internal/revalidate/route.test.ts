import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (tag: string, profile: unknown) => revalidateTag(tag, profile),
}));

import { POST } from "./route";

const SECRET = "test-revalidate-secret";

const postTags = (tags: unknown, token: string | null = SECRET) =>
  POST(
    new Request("https://web.test/internal/revalidate", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ tags }),
    }),
  );

beforeEach(() => {
  process.env.REVALIDATE_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.REVALIDATE_SECRET;
  vi.clearAllMocks();
});

describe("POST /internal/revalidate", () => {
  it("returns 503 when no secret is configured", async () => {
    delete process.env.REVALIDATE_SECRET;

    const response = await postTags(["categories"]);

    expect(response.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong bearer token", async () => {
    expect((await postTags(["categories"], null)).status).toBe(401);
    expect((await postTags(["categories"], "wrong")).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects an empty or non-array tags value", async () => {
    expect((await postTags([])).status).toBe(400);
    expect((await postTags("categories")).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a tag that is not a known revalidate tag", async () => {
    const response = await postTags(["categories", "products"]);

    expect(response.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires every requested tag immediately", async () => {
    const response = await postTags(["categories", "hero-slides"]);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      revalidated: true,
      tags: ["categories", "hero-slides"],
    });
    expect(revalidateTag).toHaveBeenCalledWith("categories", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("hero-slides", { expire: 0 });
  });
});
