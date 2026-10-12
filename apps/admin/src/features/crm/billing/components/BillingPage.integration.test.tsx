import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BillingPage } from "./BillingPage";

const API_BASE = "http://localhost:3000/api";

describe("BillingPage", () => {
  it("renders the billing heading and the free-trial card", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/billing`, () =>
        HttpResponse.json({
          success: true,
          data: {
            subscription: null,
            advancedFeaturesEnabled: true,
            planCatalog: [],
            activeSeatCount: 1,
          },
        }),
      ),
      http.get(`${API_BASE}/crm/billing/invoices`, () =>
        HttpResponse.json({ success: true, data: { invoices: [], nextCursor: null } }),
      ),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <BillingPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Billing" })).toBeInTheDocument();
    expect(await screen.findByText("Free trial")).toBeInTheDocument();
  });
});
