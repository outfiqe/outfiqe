import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { FinancialRollupPage } from "./FinancialRollupPage";

const ROLLUP_URL = "http://localhost:3000/api/admin/financial-rollup";

const BASE_ROLLUP = {
  range: "cycle",
  gateway: { grossCollected: 0, refunded: 0, netHeld: 0 },
  ledger: {
    owedToBrands: 0,
    owedToCreators: 0,
    brandPayoutsByStatus: {},
    creatorCommissionsByStatus: {},
    platformRevenueRealized: 0,
    couponSpend: 0,
    netPlatformRevenue: 0,
  },
  byPaymentMethod: {},
  attribution: { totalItems: 0, attributedItems: 0, attributedShare: 0 },
};

const MONEY_ROLLUP = {
  ...BASE_ROLLUP,
  gateway: { grossCollected: 45_830, refunded: 500, netHeld: 45_330 },
  ledger: {
    ...BASE_ROLLUP.ledger,
    owedToBrands: 7_760,
    owedToCreators: 150,
    brandPayoutsByStatus: { PENDING: 7_760, VOIDED: 57_248 },
    creatorCommissionsByStatus: { PENDING: 150 },
    platformRevenueRealized: 900,
    couponSpend: 100,
    netPlatformRevenue: 800,
  },
};

const mockRollup = (rollup: unknown) => {
  mswServer.use(
    http.get(ROLLUP_URL, () => HttpResponse.json({ success: true, message: "ok", data: rollup })),
  );
};

const renderPage = () => renderWithRouter(<FinancialRollupPage />, { path: "/financial-rollup" });

const hrefsOf = (linkName: string | RegExp) =>
  screen.getAllByRole("link", { name: linkName }).map((link) => link.getAttribute("href"));

describe("FinancialRollupPage summary", () => {
  it("says how much is held and who is owed", async () => {
    mockRollup(MONEY_ROLLUP);
    renderPage();

    const banner = await screen.findByRole("alert");
    expect(within(banner).getByText("You hold Rs. 45,330.")).toBeInTheDocument();
    expect(
      within(banner).getByText(/Rs. 7,760 is owed to brands and Rs. 150 to muses/),
    ).toBeTruthy();
  });

  it("warns when more is owed than is held", async () => {
    mockRollup({
      ...MONEY_ROLLUP,
      gateway: { grossCollected: 1_000, refunded: 0, netHeld: 1_000 },
    });
    renderPage();

    expect(await screen.findByText("You owe more than you hold.")).toBeInTheDocument();
  });

  it("says so when no money moved", async () => {
    mockRollup(BASE_ROLLUP);
    renderPage();

    expect(await screen.findByText("No money moved in this period.")).toBeInTheDocument();
  });

  it("links each card to the matching orders for that period", async () => {
    mockRollup(MONEY_ROLLUP);
    renderPage();

    await screen.findByText("Owed to brands");
    const cardHrefs = hrefsOf("This cycle");
    expect(cardHrefs.some((href) => href?.includes("focus=OWED_TO_BRANDS"))).toBe(true);
    expect(cardHrefs.some((href) => href?.includes("focus=REFUNDED"))).toBe(true);
    expect(cardHrefs.every((href) => href?.includes("/financial-rollup/ledger"))).toBe(true);
  });

  it("shows plain payout words, and only links a status with money in it", async () => {
    mockRollup(MONEY_ROLLUP);
    renderPage();

    const cancelledLink = await screen.findAllByRole("link", { name: /Cancelled/ });
    expect(cancelledLink[0]?.getAttribute("href")).toContain("payout=VOIDED");
    expect(screen.queryByRole("link", { name: /Paid out/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Paid out").length).toBeGreaterThan(0);
    expect(screen.queryByText(/VOIDED/)).not.toBeInTheDocument();
  });

  it("shows what the platform keeps after coupons", async () => {
    mockRollup(MONEY_ROLLUP);
    renderPage();

    expect(await screen.findByText("Coupons the platform paid for")).toBeInTheDocument();
    expect(screen.getByText("− Rs. 100")).toBeInTheDocument();
  });

  it("shows an error when the rollup can't load", async () => {
    mswServer.use(
      http.get(ROLLUP_URL, () =>
        HttpResponse.json({ success: false, message: "nope" }, { status: 500 }),
      ),
    );
    renderPage();

    expect(await screen.findByText("Couldn't load the rollup.")).toBeInTheDocument();
  });
});

describe("FinancialRollupPage payment methods", () => {
  it("shows an empty state when no orders exist in the period", async () => {
    mockRollup(BASE_ROLLUP);
    renderPage();

    expect(await screen.findByText("No orders in this period yet.")).toBeInTheDocument();
  });

  it("shows each method's share, order count and what the platform keeps", async () => {
    mockRollup({
      ...BASE_ROLLUP,
      byPaymentMethod: {
        COD: { gmv: 3_000, orderCount: 3, realizedTakeRate: 0.05 },
        ESEWA: { gmv: 1_000, orderCount: 1, realizedTakeRate: 0.02 },
      },
    });
    renderPage();

    const codRow = await screen.findByRole("link", { name: /Cash on delivery/ });
    expect(codRow).toHaveTextContent("3 orders · 75.0% of order value · platform keeps 5.0%");
    expect(codRow.getAttribute("href")).toContain("method=COD");
    expect(screen.getByRole("link", { name: /eSewa/ })).toHaveTextContent("1 order ·");
    expect(screen.queryByText("Khalti")).not.toBeInTheDocument();
  });
});

describe("FinancialRollupPage muse sales", () => {
  it("shows the share of items sold through muses", async () => {
    mockRollup({
      ...BASE_ROLLUP,
      attribution: { totalItems: 8, attributedItems: 2, attributedShare: 0.25 },
    });
    renderPage();

    const museRow = await screen.findByRole("link", { name: /2 of 8 items this cycle/ });
    expect(museRow).toHaveTextContent("25.0%");
    expect(museRow.getAttribute("href")).toContain("focus=MUSE_CREDITED");
  });
});
