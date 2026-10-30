import { beforeEach, describe, expect, it, vi } from "vitest";

import { cacheService } from "#redis/cache.service.js";

import { findPosthogQueryConnection, runPosthogQuery } from "./insights.posthog-query.js";
import { productAnalyticsInsightsService } from "./insights.service.js";

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

  it("shows the last good answer, marked stale, when PostHog fails", async () => {
    vi.mocked(cacheService.get).mockResolvedValueOnce(null).mockResolvedValueOnce(cachedOverview);
    vi.mocked(runPosthogQuery).mockRejectedValue(new Error("PostHog is down"));

    const result = await productAnalyticsInsightsService.overview("30d");

    expect(result).toMatchObject({ status: "stale", insight: cachedOverview.insight });
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
});
