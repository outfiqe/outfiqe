import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { LedgerTable } from "./LedgerTable";

const LEDGER_URL = "http://localhost:3000/api/admin/financial-rollup/ledger";

const buildRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  orderId: "order-1",
  orderItemId: "item-1",
  createdAt: "2026-01-05T00:00:00.000Z",
  paymentMethod: "COD",
  grossAmount: 1000,
  platformFee: 50,
  gatewayFee: 0,
  brandNetAmount: 950,
  brandPayoutStatus: "WITHDRAWN",
  creatorCommissionAmount: 100,
  creatorCommissionStatus: "AVAILABLE",
  ...overrides,
});

const renderTable = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LedgerTable />
    </QueryClientProvider>,
  );
};

describe("LedgerTable", () => {
  it("shows an empty state when there are no matching rows", async () => {
    mswServer.use(
      http.get(LEDGER_URL, () =>
        HttpResponse.json({ success: true, data: { entries: [], nextCursor: null } }),
      ),
    );

    renderTable();

    expect(await screen.findByText("No orders match these filters yet.")).toBeInTheDocument();
  });

  it("shows an error banner when the request fails", async () => {
    mswServer.use(
      http.get(LEDGER_URL, () =>
        HttpResponse.json({ success: false, message: "Nope" }, { status: 500 }),
      ),
    );

    renderTable();

    expect(await screen.findByText("Couldn't load the ledger.")).toBeInTheDocument();
  });

  it("renders a row with its fees, brand net, and status, plus totals in the footer", async () => {
    mswServer.use(
      http.get(LEDGER_URL, () =>
        HttpResponse.json({
          success: true,
          data: { entries: [buildRow()], nextCursor: null },
        }),
      ),
    );

    renderTable();

    expect(await screen.findByText("Withdrawn")).toBeInTheDocument();
    expect(screen.getAllByText("COD").length).toBeGreaterThan(0);
    expect(screen.getByText("Totals (loaded rows)")).toBeInTheDocument();
    expect(screen.getAllByText("Rs. 1,000").length).toBeGreaterThan(0);
  });

  it("shows a dash for fee columns when the item has no linked brand payout yet", async () => {
    mswServer.use(
      http.get(LEDGER_URL, () =>
        HttpResponse.json({
          success: true,
          data: {
            entries: [
              buildRow({
                grossAmount: null,
                platformFee: null,
                gatewayFee: null,
                brandNetAmount: null,
                brandPayoutStatus: null,
                creatorCommissionAmount: null,
              }),
            ],
            nextCursor: null,
          },
        }),
      ),
    );

    renderTable();

    expect(await screen.findAllByText("—")).not.toHaveLength(0);
  });

  it("re-fetches with the selected payment method when the filter changes", async () => {
    const requestedPaymentMethods: (string | null)[] = [];
    mswServer.use(
      http.get(LEDGER_URL, ({ request }) => {
        requestedPaymentMethods.push(new URL(request.url).searchParams.get("paymentMethod"));
        return HttpResponse.json({ success: true, data: { entries: [], nextCursor: null } });
      }),
    );

    const user = userEvent.setup();
    renderTable();
    await screen.findByText("No orders match these filters yet.");

    await user.selectOptions(
      screen.getByLabelText("Filter by payment method"),
      screen.getByRole("option", { name: "eSewa" }),
    );

    await waitFor(() => expect(requestedPaymentMethods).toContain("ESEWA"));
  });

  it("appends the next page when Load more is clicked", async () => {
    mswServer.use(
      http.get(LEDGER_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (!cursor) {
          return HttpResponse.json({
            success: true,
            data: { entries: [buildRow({ orderItemId: "item-1" })], nextCursor: "page-2" },
          });
        }
        return HttpResponse.json({
          success: true,
          data: { entries: [buildRow({ orderItemId: "item-2" })], nextCursor: null },
        });
      }),
    );

    const user = userEvent.setup();
    renderTable();

    await screen.findByRole("button", { name: "Load more" });
    expect(screen.getAllByRole("row")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(4));
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});
