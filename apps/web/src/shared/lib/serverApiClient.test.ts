import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ServerApiError, serverApiRequest } from "./serverApiClient";

const okEnvelope = (data: unknown) => ({
  ok: true,
  json: async () => ({ success: true, data }),
});

const stubFetch = (response: unknown) => {
  const fetchMock = vi.fn(async () => response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("serverApiRequest", () => {
  it("does not cache a request by default", async () => {
    const fetchMock = stubFetch(okEnvelope(["a"]));

    await serverApiRequest("/categories");

    const init = fetchMock.mock.calls[0]![1] as RequestInit & { next?: unknown };
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
  });

  it("caches with a revalidate window and tags when asked to", async () => {
    const fetchMock = stubFetch(okEnvelope(["a"]));

    await serverApiRequest("/categories", {
      revalidateSeconds: 120,
      cacheTags: ["categories"],
    });

    const init = fetchMock.mock.calls[0]![1] as RequestInit & {
      next?: { revalidate?: number; tags?: string[] };
    };
    expect(init.cache).toBeUndefined();
    expect(init.next).toEqual({ revalidate: 120, tags: ["categories"] });
  });

  it("refuses to cache a per-user request", async () => {
    stubFetch(okEnvelope(null));

    await expect(
      serverApiRequest("/brands/me", { revalidateSeconds: 120, accessToken: "token" }),
    ).rejects.toMatchObject({ code: "UNCACHEABLE_AUTHENTICATED_REQUEST" });
  });

  it("throws a ServerApiError carrying the backend's code on a failure envelope", async () => {
    stubFetch({
      ok: false,
      json: async () => ({ success: false, message: "Nope", code: "FORBIDDEN" }),
    });

    await expect(serverApiRequest("/brands/me")).rejects.toBeInstanceOf(ServerApiError);
    await expect(serverApiRequest("/brands/me")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
