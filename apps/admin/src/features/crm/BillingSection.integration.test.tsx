import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { BillingSection } from "./BillingSection";

const API_BASE = "http://localhost:3000/api";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const PLAN_CATALOG = [
  {
    id: "starter",
    name: "Starter",
    pricePerSeatPerMonth: 900,
    minSeats: 1,
    maxSeats: 10,
    unlocksAdvancedFeatures: true,
  },
];

const mockOverview = (overview: Record<string, unknown>) => {
  mswServer.use(
    http.get(`${API_BASE}/crm/billing`, () => HttpResponse.json({ success: true, data: overview })),
  );
};

const mockInvoices = (invoices: unknown[]) => {
  mswServer.use(
    http.get(`${API_BASE}/crm/billing/invoices`, () =>
      HttpResponse.json({ success: true, data: { invoices, nextCursor: null } }),
    ),
  );
};

describe("BillingSection", () => {
  it("shows the free-trial state when there is no subscription", async () => {
    mockOverview({
      subscription: null,
      advancedFeaturesEnabled: true,
      planCatalog: PLAN_CATALOG,
      activeSeatCount: 2,
    });
    mockInvoices([]);

    render(<BillingSection />, { wrapper });

    expect(await screen.findByText("Free trial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
    expect(screen.getByText("No invoices yet.")).toBeInTheDocument();
  });

  it("renders the active subscription and its invoice history", async () => {
    mockOverview({
      subscription: {
        id: "sub-1",
        organizationId: "org-1",
        plan: "starter",
        status: "ACTIVE",
        seats: 5,
        currentPeriodEnd: "2026-10-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      },
      advancedFeaturesEnabled: true,
      planCatalog: PLAN_CATALOG,
      activeSeatCount: 3,
    });
    mockInvoices([
      {
        id: "inv-1",
        plan: "starter",
        seats: 5,
        amount: 4500,
        status: "PAID",
        periodStart: "2026-09-01T00:00:00.000Z",
        periodEnd: "2026-10-01T00:00:00.000Z",
        provider: "ESEWA",
        initiatedAt: "2026-09-01T00:00:00.000Z",
        paidAt: "2026-09-01T00:05:00.000Z",
        voidedAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ]);

    render(<BillingSection />, { wrapper });

    expect(await screen.findByText("Starter")).toBeInTheDocument();
    expect(screen.getByText(/5 seats · 3 in use/)).toBeInTheDocument();
    expect(await screen.findByText("Rs. 4,500")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel renewal" })).toBeInTheDocument();
  });

  it("surfaces an unpaid renewal invoice with a way to pay it", async () => {
    mockOverview({
      subscription: {
        id: "sub-1",
        organizationId: "org-1",
        plan: "starter",
        status: "PAST_DUE",
        seats: 3,
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      },
      advancedFeaturesEnabled: false,
      planCatalog: PLAN_CATALOG,
      activeSeatCount: 3,
    });
    mockInvoices([
      {
        id: "inv-open",
        plan: "starter",
        seats: 3,
        amount: 2700,
        status: "OPEN",
        periodStart: "2026-09-01T00:00:00.000Z",
        periodEnd: "2026-10-01T00:00:00.000Z",
        provider: null,
        initiatedAt: null,
        paidAt: null,
        voidedAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ]);

    render(<BillingSection />, { wrapper });

    expect(await screen.findByText(/unpaid invoice for Rs\. 2,700/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay now" })).toBeInTheDocument();
  });

  it("opens the checkout modal with plan, seat and provider choices", async () => {
    mockOverview({
      subscription: null,
      advancedFeaturesEnabled: true,
      planCatalog: PLAN_CATALOG,
      activeSeatCount: 4,
    });
    mockInvoices([]);

    render(<BillingSection />, { wrapper });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Subscribe" }));

    expect(await screen.findByLabelText("Plan")).toBeInTheDocument();
    expect(screen.getByLabelText(/Seats \(at least 4/)).toHaveValue(4);
    expect(screen.getByLabelText("Pay with")).toBeInTheDocument();
    expect(screen.getByText("Estimated monthly total: Rs. 3,600")).toBeInTheDocument();
  });

  it("shows an error banner when the overview fails to load", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/crm/billing`,
        () =>
          new HttpResponse(
            JSON.stringify({ success: false, message: "Forbidden", code: "FORBIDDEN" }),
            { status: 403 },
          ),
      ),
    );

    render(<BillingSection />, { wrapper });

    await waitFor(() => expect(screen.getByText("Forbidden")).toBeInTheDocument());
  });
});
