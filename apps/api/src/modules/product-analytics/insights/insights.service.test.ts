import { beforeEach, describe, expect, it, vi } from "vitest";

import { cacheService } from "#redis/cache.service.js";

import { findPosthogQueryConnection, runPosthogQuery } from "./insights.posthog-query.js";
import { productAnalyticsInsightsRepository } from "./insights.repository.js";
import { productAnalyticsInsightsService } from "./insights.service.js";

const { PRODUCT_ID } = vi.hoisted(() => ({
  PRODUCT_ID: "4e36b676-1951-4f2f-903c-b9a51104b65c",
}));

vi.mock("#redis/cache.service.js", () => ({
  cacheService: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("./insights.posthog-query.js", () => ({
  findPosthogQueryConnection: vi.fn(),
  runPosthogQuery: vi.fn(),
}));

vi.mock("./insights.repository.js", () => ({
  productAnalyticsInsightsRepository: {
    findCreatorNames: vi.fn(async () => [{ id: "creator-1", name: "Sita Rai", handle: "sita" }]),
    findProductNames: vi.fn(async () => [{ id: PRODUCT_ID, name: "Linen kurta" }]),
    findBrandNames: vi.fn(async () => []),
  },
}));

const connection = {
  appHost: "https://us.posthog.com",
  projectId: "550784",
  queryApiKey: "phx_test",
};

const overviewRow = [[200, 12, 8, 10]];

const cachedOverview = {
  insight: { visitors: 100, signups: 5, buyers: 4, orders: 6, visitToBuyerRate: 0.04 },
  refreshedAt: "2026-10-30T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findPosthogQueryConnection).mockReturnValue(connection);
  vi.mocked(cacheService.get).mockResolvedValue(null);
  vi.mocked(cacheService.set).mockResolvedValue(undefined);
});

describe("productAnalyticsInsightsService", () => {
  it("says analytics isn't connected when the query key or project id is missing", async () => {
    vi.mocked(findPosthogQueryConnection).mockReturnValue(null);

    await expect(productAnalyticsInsightsService.overview("30d")).resolves.toEqual({
      status: "not_connected",
      refreshedAt: null,
      posthogUrl: null,
      insight: null,
    });
    expect(runPosthogQuery).not.toHaveBeenCalled();
  });

  it("answers from the 15-minute cache without asking PostHog", async () => {
    vi.mocked(cacheService.get).mockResolvedValueOnce(cachedOverview);

    const result = await productAnalyticsInsightsService.overview("30d");

    expect(result).toEqual({
      status: "fresh",
      posthogUrl: "https://us.posthog.com/project/550784/web",
      ...cachedOverview,
    });
    expect(runPosthogQuery).not.toHaveBeenCalled();
  });

  it("asks PostHog, then keeps the answer both as fresh and as the last good copy", async () => {
    vi.mocked(runPosthogQuery).mockResolvedValue(overviewRow);

    const result = await productAnalyticsInsightsService.overview("7d");

    expect(result.status).toBe("fresh");
    expect(result.insight).toEqual({
      visitors: 200,
      signups: 12,
      buyers: 8,
      orders: 10,
      visitToBuyerRate: 0.04,
    });
    const overviewSql = vi.mocked(runPosthogQuery).mock.calls[0]?.[2] ?? "";
    expect(overviewSql).toContain("toIntervalDay(7)");
    expect(overviewSql).toContain("toString(properties.signup_method) != 'staff_created'");
    expect(overviewSql).toContain("uniqIf(toString(properties.order_id)");
    const cachedKeys = vi.mocked(cacheService.set).mock.calls.map(([key]) => key);
    expect(cachedKeys).toEqual([
      "product-analytics:insight:fresh:overview:7d",
      "product-analytics:insight:last-good:overview:7d",
    ]);
  });

  it("answers at once from a recent copy, and refreshes it in the background", async () => {
    const recentCopy = { ...cachedOverview, refreshedAt: new Date().toISOString() };
    vi.mocked(cacheService.get).mockResolvedValueOnce(null).mockResolvedValueOnce(recentCopy);
    vi.mocked(runPosthogQuery).mockResolvedValue(overviewRow);

    const result = await productAnalyticsInsightsService.overview("30d");

    expect(result).toMatchObject({ status: "fresh", insight: recentCopy.insight });
    await vi.waitFor(() => expect(cacheService.set).toHaveBeenCalledTimes(2));
  });

  it("runs only one background refresh at a time for the same copy", async () => {
    const recentCopy = { ...cachedOverview, refreshedAt: new Date().toISOString() };
    vi.mocked(cacheService.get).mockImplementation(async (key) =>
      key.includes("last-good") ? recentCopy : null,
    );
    let finishPosthogQuery: (rows: unknown[][]) => void = () => undefined;
    vi.mocked(runPosthogQuery).mockReturnValue(
      new Promise((resolve) => {
        finishPosthogQuery = resolve;
      }),
    );

    await productAnalyticsInsightsService.overview("90d");
    await productAnalyticsInsightsService.overview("90d");

    expect(runPosthogQuery).toHaveBeenCalledTimes(1);
    finishPosthogQuery(overviewRow);
    await vi.waitFor(() => expect(cacheService.set).toHaveBeenCalledTimes(2));
  });

  it("keeps the recent copy when the background refresh fails", async () => {
    const recentCopy = { ...cachedOverview, refreshedAt: new Date().toISOString() };
    vi.mocked(cacheService.get).mockResolvedValueOnce(null).mockResolvedValueOnce(recentCopy);
    vi.mocked(runPosthogQuery).mockRejectedValue(new Error("PostHog is down"));

    const result = await productAnalyticsInsightsService.overview("7d");

    expect(result).toMatchObject({ status: "fresh", insight: recentCopy.insight });
    await vi.waitFor(() => expect(runPosthogQuery).toHaveBeenCalled());
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it("waits for PostHog when the only copy is over a day old", async () => {
    const oldCopy = { ...cachedOverview, refreshedAt: "2020-01-01T00:00:00.000Z" };
    vi.mocked(cacheService.get).mockResolvedValueOnce(null).mockResolvedValueOnce(oldCopy);
    vi.mocked(runPosthogQuery).mockResolvedValue(overviewRow);

    const { insight } = await productAnalyticsInsightsService.overview("30d");

    expect(insight).toMatchObject({ visitors: 200 });
  });

  it("shows the last good answer, marked stale, when PostHog fails", async () => {
    const oldCopy = { ...cachedOverview, refreshedAt: "2020-01-01T00:00:00.000Z" };
    vi.mocked(cacheService.get).mockResolvedValueOnce(null).mockResolvedValueOnce(oldCopy);
    vi.mocked(runPosthogQuery).mockRejectedValue(new Error("PostHog is down"));

    const result = await productAnalyticsInsightsService.overview("30d");

    expect(result).toMatchObject({ status: "stale", insight: oldCopy.insight });
  });

  it("reports unavailable when PostHog fails and nothing was ever cached", async () => {
    vi.mocked(runPosthogQuery).mockRejectedValue(new Error("PostHog is down"));

    const result = await productAnalyticsInsightsService.overview("30d");

    expect(result).toMatchObject({ status: "unavailable", insight: null });
  });

  it("still answers when the cache itself is down", async () => {
    vi.mocked(cacheService.get).mockRejectedValue(new Error("redis down"));
    vi.mocked(cacheService.set).mockRejectedValue(new Error("redis down"));
    vi.mocked(runPosthogQuery).mockResolvedValue(overviewRow);

    const result = await productAnalyticsInsightsService.overview("30d");

    expect(result.status).toBe("fresh");
  });

  it("builds the purchase funnel in step order with orders per payment method", async () => {
    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([
        ["product:detail_view", 120],
        ["checkout:order_place", 6],
      ])
      .mockResolvedValueOnce([
        ["cod", 4],
        ["esewa", 2],
      ]);

    const { insight } = await productAnalyticsInsightsService.purchaseFunnel("30d");
    const funnelStepsSql = vi.mocked(runPosthogQuery).mock.calls[0]?.[2] ?? "";
    expect(funnelStepsSql).toContain("person.properties.is_internal");
    expect(funnelStepsSql).toContain("person.properties.is_brand_owner");

    expect(insight?.steps.map(({ event, persons }) => [event, persons])).toEqual([
      ["product:detail_view", 120],
      ["cart:item_add", 0],
      ["checkout:checkout_start", 0],
      ["checkout:order_submit", 0],
      ["checkout:order_place", 6],
    ]);
    expect(insight?.ordersByPaymentMethod).toEqual([
      { paymentMethod: "cod", orders: 4 },
      { paymentMethod: "esewa", orders: 2 },
    ]);
  });

  it("builds look-to-order, acquisition, retention and zero-result searches", async () => {
    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([["look:detail_view", 50]])
      .mockResolvedValueOnce([[3]])
      .mockResolvedValueOnce([
        ["creator-1", 30],
        ["creator-gone", 4],
      ]);
    const lookToOrder = await productAnalyticsInsightsService.lookToOrder("30d");
    const lookStepsQuery = vi.mocked(runPosthogQuery).mock.calls[0]?.[2] ?? "";
    expect(lookStepsQuery).toContain("person_id IN (");
    expect(lookStepsQuery).toMatch(/event IN \('look:detail_view', 'look:product_tag_click'\)/);
    expect(lookToOrder.insight).toMatchObject({
      attributedOrders: 3,
      topCreatorsByLookViews: [
        { creatorId: "creator-1", creatorName: "Sita Rai", creatorHandle: "sita", lookViews: 30 },
        { creatorId: "creator-gone", creatorName: null, creatorHandle: null, lookViews: 4 },
      ],
    });

    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([["instagram.com", 40]])
      .mockResolvedValueOnce([["dashain-sale", 12]])
      .mockResolvedValueOnce([[9]]);
    const acquisition = await productAnalyticsInsightsService.acquisition("30d");
    expect(acquisition.insight).toEqual({
      sources: [{ source: "instagram.com", visitors: 40 }],
      campaigns: [{ campaign: "dashain-sale", visitors: 12 }],
      creatorLinkClicks: 9,
    });

    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([["2026-10-19", 80]])
      .mockResolvedValueOnce([[10, 4]]);
    const retention = await productAnalyticsInsightsService.retention("90d");
    const weeklyVisitorsSql = vi.mocked(runPosthogQuery).mock.calls.at(-2)?.[2] ?? "";
    expect(weeklyVisitorsSql).toContain("toStartOfWeek(now()) - toIntervalWeek(7)");
    const repeatBuyersSql = vi.mocked(runPosthogQuery).mock.lastCall?.[2] ?? "";
    expect(repeatBuyersSql).toContain("toString(properties.is_first_order) = 'false'");
    expect(retention.insight).toEqual({
      weeklyActiveVisitors: [{ weekStart: "2026-10-19", visitors: 80 }],
      buyers: 10,
      repeatBuyers: 4,
      repeatPurchaseRate: 0.4,
    });

    vi.mocked(runPosthogQuery).mockResolvedValueOnce([["velvet saree", 5]]);
    const zeroResultSearches = await productAnalyticsInsightsService.zeroResultSearches("7d");
    expect(zeroResultSearches.insight).toEqual({
      searches: [{ query: "velvet saree", searchCount: 5 }],
    });
  });

  it("builds site traffic, giving product pages their names", async () => {
    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([[36, 8]])
      .mockResolvedValueOnce([[154.5, 0.25]])
      .mockResolvedValueOnce([
        ["/", 18],
        [`/product/${PRODUCT_ID}`, 6],
        ["/product/not-a-real-id", 2],
      ])
      .mockResolvedValueOnce([["/", 6]])
      .mockResolvedValueOnce([
        [null, 3],
        ["/login", 1],
      ]);

    const { status, insight, posthogUrl } =
      await productAnalyticsInsightsService.siteTraffic("30d");

    expect(status).toBe("fresh");
    expect(posthogUrl).toBe("https://us.posthog.com/project/550784/web");
    expect(insight).toEqual({
      pageViews: 36,
      sessions: 8,
      averageSessionSeconds: 154.5,
      bounceRate: 0.25,
      topPages: [
        { path: "/", productName: null, count: 18 },
        { path: `/product/${PRODUCT_ID}`, productName: "Linen kurta", count: 6 },
        { path: "/product/not-a-real-id", productName: null, count: 2 },
      ],
      entryPages: [{ path: "/", productName: null, count: 6 }],
      exitPages: [{ path: "/login", productName: null, count: 1 }],
    });
  });

  it("still shows site traffic, with plain paths, when product names can't be loaded", async () => {
    vi.mocked(productAnalyticsInsightsRepository.findProductNames).mockRejectedValueOnce(
      new Error("database down"),
    );
    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([[6, 2]])
      .mockResolvedValueOnce([[30, 0]])
      .mockResolvedValueOnce([[`/product/${PRODUCT_ID}`, 6]])
      .mockResolvedValue([]);

    const { status, insight } = await productAnalyticsInsightsService.siteTraffic("30d");

    expect(status).toBe("fresh");
    expect(insight?.topPages).toEqual([
      { path: `/product/${PRODUCT_ID}`, productName: null, count: 6 },
    ]);
  });

  it("shows zero traffic, not a failure, for a range with no sessions", async () => {
    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([[0, 0]])
      .mockResolvedValueOnce([[null, null]])
      .mockResolvedValue([]);

    const { status, insight } = await productAnalyticsInsightsService.siteTraffic("7d");

    expect(status).toBe("fresh");
    expect(insight).toMatchObject({
      pageViews: 0,
      averageSessionSeconds: 0,
      bounceRate: 0,
      topPages: [],
    });
  });

  const speedRow = [
    19, 9, 2284, 2900, 3500, 5100, 5, 88, 120, 180, 300, 8, 1968, 2400, 2800, 4000, 7, 0.0087, 0.02,
    0.05, 0.1,
  ];

  it("builds each speed measurement with its readings and four percentiles", async () => {
    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([speedRow])
      .mockResolvedValueOnce([["/", 4690, 12]]);

    const { insight, posthogUrl } = await productAnalyticsInsightsService.siteSpeed("30d");

    const [, , speedQuery] = vi.mocked(runPosthogQuery).mock.calls[0] ?? [];
    expect(speedQuery).toContain("quantile(0.75)");
    expect(speedQuery).toContain("quantile(0.99)");
    expect(posthogUrl).toBe("https://us.posthog.com/project/550784/web/web-vitals");
    expect(insight).toMatchObject({
      measurementCount: 19,
      largestContentfulPaint: { sampleCount: 9, p75: 2284, p90: 2900, p95: 3500, p99: 5100 },
      interactionToNextPaint: { sampleCount: 5, p75: 88, p99: 300 },
      firstContentfulPaint: { sampleCount: 8, p75: 1968 },
      cumulativeLayoutShift: { sampleCount: 7, p75: 0.0087, p99: 0.1 },
      slowestPages: [
        { path: "/", typicalLoadMs: 4690, sampleCount: 12, productName: null, brandName: null },
      ],
    });
  });

  it("narrows speed by device and page, and caches each choice apart", async () => {
    vi.mocked(runPosthogQuery).mockResolvedValueOnce([speedRow]).mockResolvedValueOnce([]);

    await productAnalyticsInsightsService.siteSpeed("7d", { device: "mobile", page: "home" });

    const [, , speedQuery] = vi.mocked(runPosthogQuery).mock.calls[0] ?? [];
    expect(speedQuery).toContain("= 'Mobile'");
    expect(speedQuery).toContain("properties.$pathname) = '/'");
    const [writtenKey] = vi.mocked(cacheService.set).mock.calls[0] ?? [];
    expect(writtenKey).toContain(":mobile:home");
  });

  it("keeps site speed empty, not zero, for a range with no measurements", async () => {
    vi.mocked(runPosthogQuery)
      .mockResolvedValueOnce([[0, ...Array.from({ length: 20 }, () => null)]])
      .mockResolvedValueOnce([]);

    const { insight } = await productAnalyticsInsightsService.siteSpeed("7d");

    expect(insight).toMatchObject({
      measurementCount: 0,
      largestContentfulPaint: { sampleCount: 0, p75: null, p99: null },
      slowestPages: [],
    });
  });
});
