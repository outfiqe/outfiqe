import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BillingSection } from "./BillingSection";

const API_BASE = "http://localhost:3000/api";

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

    renderWithRouter(<BillingSection />);

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

    renderWithRouter(<BillingSection />);

    expect(await screen.findAllByText("Starter")).not.toHaveLength(0);
    expect(screen.getByText(/3 of 5 seats used/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage your team" })).toBeInTheDocument();
    expect(screen.getByText(/^Your plan renews on/)).toBeInTheDocument();
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

    renderWithRouter(<BillingSection />);

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

    renderWithRouter(<BillingSection />);

    const user = userEvent.setup({ delay: null });
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

    renderWithRouter(<BillingSection />);

    await waitFor(() => expect(screen.getByText("Forbidden")).toBeInTheDocument());
  });

  it("loads older invoices with a Load more button", async () => {
    mockOverview({
      subscription: null,
      advancedFeaturesEnabled: true,
      planCatalog: PLAN_CATALOG,
      activeSeatCount: 1,
    });
    const invoice = (id: string, amount: number) => ({
      id,
      plan: "starter",
      seats: 1,
      amount,
      status: "VOID",
      periodStart: "2026-09-01T00:00:00.000Z",
      periodEnd: "2026-10-01T00:00:00.000Z",
      provider: "ESEWA",
      initiatedAt: null,
      paidAt: null,
      voidedAt: "2026-09-02T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
    });
    const requestedCursors: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/crm/billing/invoices`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        requestedCursors.push(cursor);
        return HttpResponse.json({
          success: true,
          data: cursor
            ? { invoices: [invoice("inv-2", 1200)], nextCursor: null }
            : { invoices: [invoice("inv-1", 900)], nextCursor: "inv-1" },
        });
      }),
    );

    renderWithRouter(<BillingSection />);
    const user = userEvent.setup();

    expect(await screen.findByText("Rs. 900")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Rs. 1,200")).toBeInTheDocument();
    expect(requestedCursors).toEqual([null, "inv-1"]);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("hides voided invoices until the toggle is switched on", async () => {
    mockOverview({
      subscription: null,
      advancedFeaturesEnabled: true,
      planCatalog: PLAN_CATALOG,
      activeSeatCount: 1,
    });
    const invoice = (id: string, amount: number, status: string) => ({
      id,
      plan: "starter",
      seats: 1,
      amount,
      status,
      periodStart: "2026-09-01T00:00:00.000Z",
      periodEnd: "2026-10-01T00:00:00.000Z",
      provider: "ESEWA",
      initiatedAt: null,
      paidAt: null,
      voidedAt: null,
      createdAt: "2026-09-01T00:00:00.000Z",
    });
    const requestedFlags: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/crm/billing/invoices`, ({ request }) => {
        const includeVoided = new URL(request.url).searchParams.get("includeVoided");
        requestedFlags.push(includeVoided);
        return HttpResponse.json({
          success: true,
          data: {
            invoices:
              includeVoided === "true"
                ? [invoice("inv-2", 700, "VOID"), invoice("inv-1", 900, "PAID")]
                : [invoice("inv-1", 900, "PAID")],
            nextCursor: null,
          },
        });
      }),
    );

    renderWithRouter(<BillingSection />);
    const user = userEvent.setup();

    expect(await screen.findByText("Rs. 900")).toBeInTheDocument();
    expect(screen.queryByText("Rs. 700")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Show voided invoices"));

    expect(await screen.findByText("Rs. 700")).toBeInTheDocument();
    expect(requestedFlags).toEqual([null, "true"]);
  });

  const ACTIVE_OVERVIEW = {
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
  };

  const OPEN_INVOICE = {
    id: "inv-1",
    plan: "starter",
    seats: 5,
    amount: 4500,
    status: "OPEN",
    periodStart: "2026-09-01T00:00:00.000Z",
    periodEnd: "2026-10-01T00:00:00.000Z",
    provider: null,
    initiatedAt: null,
    paidAt: null,
    voidedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  it("warns before cancelling and only cancels once confirmed", async () => {
    mockOverview(ACTIVE_OVERVIEW);
    mockInvoices([]);
    let cancelCount = 0;
    mswServer.use(
      http.post(`${API_BASE}/crm/billing/cancel`, () => {
        cancelCount += 1;
        return HttpResponse.json({ success: true, data: null });
      }),
    );
    renderWithRouter(<BillingSection />);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Cancel renewal" }));
    const warning = await screen.findByRole("dialog", { name: "Cancel renewal?" });
    expect(within(warning).getByText(/stays active until/)).toBeInTheDocument();
    expect(cancelCount).toBe(0);

    await user.click(within(warning).getByRole("button", { name: "Cancel renewal" }));
    await waitFor(() => expect(cancelCount).toBe(1));
  });

  it("opens an invoice panel from its row, with a way to pay an open invoice", async () => {
    mockOverview(ACTIVE_OVERVIEW);
    mockInvoices([OPEN_INVOICE]);
    renderWithRouter(<BillingSection />);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("cell", { name: "Rs. 4,500" }));

    const panel = await screen.findByRole("dialog", { name: "Invoice for Rs. 4,500" });
    expect(within(panel).getByText("Starter")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Pay this invoice" }));
    expect(await screen.findByLabelText("Pay with")).toBeInTheDocument();
  });

  it("explains when a cancelled plan will end", async () => {
    mockOverview({
      ...ACTIVE_OVERVIEW,
      subscription: { ...ACTIVE_OVERVIEW.subscription, cancelAtPeriodEnd: true },
    });
    mockInvoices([]);
    renderWithRouter(<BillingSection />);

    expect(await screen.findByText(/stays active until .*, then it ends/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel renewal" })).not.toBeInTheDocument();
  });
});
