import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { FinancialRollupPage } from "./FinancialRollupPage";

const ROLLUP_URL = "http://localhost:3000/api/admin/financial-rollup";
const LEDGER_URL = "http://localhost:3000/api/admin/financial-rollup/ledger";

beforeEach(() => {
  mswServer.use(
    http.get(LEDGER_URL, () =>
      HttpResponse.json({ success: true, data: { entries: [], nextCursor: null } }),
    ),
  );
});

const BASE_ROLLUP = {
  range: "cycle",
  gateway: { grossCollected: 0, refunded: 0, netHeld: 0 },
  ledger: {
    owedToBrands: 0,
    owedToCreators: 0,
    brandPayoutsByStatus: {},
    creatorCommissionsByStatus: {},
    platformRevenueRealized: 0,
  },
  byPaymentMethod: {},
  attribution: { totalItems: 0, attributedItems: 0, attributedShare: 0 },
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FinancialRollupPage />
    </QueryClientProvider>,
  );
};

describe("FinancialRollupPage payment method breakdown", () => {
  it("shows an empty state when no orders exist in the range yet", async () => {
    mswServer.use(
      http.get(ROLLUP_URL, () => HttpResponse.json({ success: true, data: BASE_ROLLUP })),
    );

    renderPage();

    expect(await screen.findByText("GMV by payment method")).toBeInTheDocument();
    expect(screen.getByText("No orders in this range yet.")).toBeInTheDocument();
  });

  it("renders each payment method's GMV share, order count, and realized take rate", async () => {
    mswServer.use(
      http.get(ROLLUP_URL, () =>
        HttpResponse.json({
          success: true,
          data: {
            ...BASE_ROLLUP,
            byPaymentMethod: {
              COD: { gmv: 3000, orderCount: 3, realizedTakeRate: 0.05 },
              ESEWA: { gmv: 1000, orderCount: 1, realizedTakeRate: 0.035 },
            },
          },
        }),
      ),
    );

    renderPage();

    const heading = await screen.findByText("GMV by payment method");
    const panel = within(heading.closest("div") as HTMLElement);

    expect(panel.getByText("COD")).toBeInTheDocument();
    expect(panel.getByText("eSewa")).toBeInTheDocument();
    expect(panel.getByText("3 orders")).toBeInTheDocument();
    expect(panel.getByText("1 order")).toBeInTheDocument();
    expect(panel.getByText(/75\.0% of GMV/)).toBeInTheDocument();
    expect(panel.getByText(/25\.0% of GMV/)).toBeInTheDocument();
    expect(panel.getByText("5.0% realized take rate")).toBeInTheDocument();
    expect(panel.getByText("3.5% realized take rate")).toBeInTheDocument();
    expect(panel.queryByText("Khalti")).not.toBeInTheDocument();
  });
});

describe("FinancialRollupPage attributed order share", () => {
  it("shows the attributed share as a percentage", async () => {
    mswServer.use(
      http.get(ROLLUP_URL, () =>
        HttpResponse.json({
          success: true,
          data: {
            ...BASE_ROLLUP,
            attribution: { totalItems: 4, attributedItems: 3, attributedShare: 0.75 },
          },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Attributed order share")).toBeInTheDocument();
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText(/3 of 4 order items this cycle/)).toBeInTheDocument();
  });

  it("shows 0.0% rather than a broken percentage when there are no order items yet", async () => {
    mswServer.use(
      http.get(ROLLUP_URL, () => HttpResponse.json({ success: true, data: BASE_ROLLUP })),
    );

    renderPage();

    expect(await screen.findByText("Attributed order share")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});
