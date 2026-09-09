import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
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
  },
  byPaymentMethod: {},
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

    expect(await screen.findByText("COD")).toBeInTheDocument();
    expect(screen.getByText("eSewa")).toBeInTheDocument();
    expect(screen.getByText("3 orders")).toBeInTheDocument();
    expect(screen.getByText("1 order")).toBeInTheDocument();
    expect(screen.getByText(/75\.0% of GMV/)).toBeInTheDocument();
    expect(screen.getByText(/25\.0% of GMV/)).toBeInTheDocument();
    expect(screen.getByText("5.0% realized take rate")).toBeInTheDocument();
    expect(screen.getByText("3.5% realized take rate")).toBeInTheDocument();
    expect(screen.queryByText("Khalti")).not.toBeInTheDocument();
  });
});
