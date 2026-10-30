import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const environment = vi.hoisted(() => {
  const testEnvironment: { projectId: string | undefined; queryApiKey: string | undefined } = {
    projectId: "550784",
    queryApiKey: "phx_test",
  };
  return testEnvironment;
});

vi.mock("#config/env.config.js", () => ({
  env: {
    POSTHOG_APP_HOST: "https://us.posthog.com",
    get POSTHOG_PROJECT_ID() {
      return environment.projectId;
    },
    get POSTHOG_QUERY_API_KEY() {
      return environment.queryApiKey;
    },
  },
}));

const { findPosthogQueryConnection, runPosthogQuery } = await import("./insights.posthog-query.js");

const connection = {
  appHost: "https://us.posthog.com",
  projectId: "550784",
  queryApiKey: "phx_test",
};

const fetchMock = vi.fn();

beforeEach(() => {
  environment.projectId = "550784";
  environment.queryApiKey = "phx_test";
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("findPosthogQueryConnection", () => {
  it("is connected only when both the project id and the query key are set", () => {
    expect(findPosthogQueryConnection()).toEqual(connection);

    environment.queryApiKey = undefined;
    expect(findPosthogQueryConnection()).toBeNull();
  });
});

describe("runPosthogQuery", () => {
  it("sends a named HogQL query with the read-only key and returns the result rows", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ results: [[42]] })));

    await expect(runPosthogQuery(connection, "overview", "SELECT 42")).resolves.toEqual([[42]]);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://us.posthog.com/api/projects/550784/query/");
    expect(init.headers.Authorization).toBe("Bearer phx_test");
    expect(JSON.parse(init.body)).toEqual({
      query: { kind: "HogQLQuery", query: "SELECT 42" },
      name: "outfiqe-admin-analytics:overview",
    });
  });

  it("fails on an error answer so the caller can fall back to the cache", async () => {
    fetchMock.mockResolvedValue(new Response("rate limited", { status: 429 }));

    await expect(runPosthogQuery(connection, "overview", "SELECT 1")).rejects.toThrow(
      "answered with status 429",
    );
  });

  it("never runs more than two queries at once, to stay inside PostHog's limit", async () => {
    let inFlight = 0;
    let mostInFlight = 0;
    fetchMock.mockImplementation(async () => {
      inFlight += 1;
      mostInFlight = Math.max(mostInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return new Response(JSON.stringify({ results: [] }));
    });

    await Promise.all(
      ["a", "b", "c", "d", "e"].map((queryName) =>
        runPosthogQuery(connection, queryName, "SELECT 1"),
      ),
    );

    expect(mostInFlight).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
