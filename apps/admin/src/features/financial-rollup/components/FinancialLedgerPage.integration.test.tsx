import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FinancialLedgerPage } from "./FinancialLedgerPage";

const LEDGER_URL = "http://localhost:3000/api/admin/financial-rollup/ledger";
const LEDGER_PATH = "/financial-rollup/ledger";

const TOTALS = {
  rowCount: 12,
  grossAmount: 12_000,
  platformFee: 600,
  gatewayFee: 0,
  creatorCommissionAmount: 100,
  brandNetAmount: 11_400,
};

const buildRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  orderId: "order-1",
  orderItemId: "item-1",
  createdAt: "2026-01-05T00:00:00.000Z",
  paymentMethod: "COD",
  orderPaymentStatus: "PAID",
  orderFulfilmentStatus: "DELIVERED",
  quantity: 1,
  productName: "Dhaka Topi",
  productImageUrl: null,
  brandName: "Everlane",
  buyerName: "Asha Rai",
  museHandle: null,
  grossAmount: 1000,
  platformFee: 50,
  gatewayFee: 0,
  brandNetAmount: 950,
  brandPayoutStatus: "WITHDRAWN",
  creatorCommissionAmount: 100,
  creatorCommissionStatus: "AVAILABLE",
  ...overrides,
});

const LEDGER_ITEM = {
  id: "item-1",
  qty: 2,
  unitPrice: 500,
  listUnitPrice: 600,
  brandDiscountAmount: 100,
  refundedQty: 0,
  createdAt: "2026-01-05T00:00:00.000Z",
  attributionSource: "TAG_CLICK",
  attributedCreatorLookId: "look-1",
  attributedOutfitId: null,
  size: { label: "M" },
  product: {
    id: "product-1",
    name: "Dhaka Topi",
    imageUrl: null,
    brand: { id: "brand-1", name: "Everlane" },
  },
  attributedCreator: { id: "muse-1", name: "Mira Gurung", handle: "mira" },
  brandPayout: {
    grossAmount: 1000,
    platformFee: 50,
    gatewayFee: 0,
    netAmount: 950,
    status: "VOIDED",
    availableAt: null,
    withdrawnAt: null,
    voidedReason: "Order cancelled",
    needsManualClawback: false,
  },
  commissions: [
    {
      id: "commission-1",
      amount: 100,
      status: "PENDING",
      source: "TAG_CLICK",
      availableAt: null,
      paidAt: null,
      voidedReason: null,
      creator: { name: "Mira Gurung", handle: "mira" },
      recipientBrand: null,
    },
  ],
  order: {
    id: "order-1",
    createdAt: "2026-01-05T00:00:00.000Z",
    fullName: "Asha Rai",
    phone: "9800000000",
    address: "Baneshwor",
    city: "Kathmandu",
    paymentMethod: "COD",
    paymentStatus: "PAID",
    fulfilmentStatus: "SHIPPED",
    subtotal: 1000,
    deliveryFee: 100,
    total: 1100,
    platformDiscountTotal: 0,
    brandDiscountTotal: 200,
    user: { id: "user-1", name: "Asha Rai", email: "asha@outfiqe.test", handle: "asha" },
    couponRedemption: {
      discountAmount: 50,
      platformFundedAmount: 50,
      brandFundedAmount: 0,
      status: "CONSUMED",
      coupon: { code: "SAVE50" },
    },
    transactions: [
      {
        id: "transaction-1",
        provider: "COD",
        type: "PAYMENT",
        status: "SUCCEEDED",
        amount: 1100,
        createdAt: "2026-01-05T00:00:00.000Z",
      },
    ],
    refunds: [],
    _count: { items: 1 },
  },
};

const ledgerResponse = (entries: unknown[], nextCursor: string | null = null) =>
  HttpResponse.json({
    success: true,
    message: "ok",
    data: { entries, nextCursor, totals: TOTALS },
  });

const mockLedger = (entries: unknown[], requestedUrls: URL[] = []) => {
  mswServer.use(
    http.get(LEDGER_URL, ({ request }) => {
      requestedUrls.push(new URL(request.url));
      return ledgerResponse(entries);
    }),
  );
};

const renderPage = (initialEntry = LEDGER_PATH) =>
  renderWithRouter(<FinancialLedgerPage />, { path: LEDGER_PATH, initialEntry });

describe("FinancialLedgerPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state when nothing matches", async () => {
    mockLedger([]);
    renderPage();

    expect(await screen.findByText("No items match these filters.")).toBeInTheDocument();
  });

  it("shows an error banner when the request fails", async () => {
    mswServer.use(
      http.get(LEDGER_URL, () =>
        HttpResponse.json({ success: false, message: "nope" }, { status: 500 }),
      ),
    );
    renderPage();

    expect(await screen.findByText("Couldn't load the ledger.")).toBeInTheDocument();
  });

  it("says what each row is and totals every matching item", async () => {
    mockLedger([buildRow()]);
    renderPage();

    expect(await screen.findByText("Dhaka Topi")).toBeInTheDocument();
    expect(screen.getByText(/Everlane · bought by Asha Rai/)).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Paid out")).toBeInTheDocument();
    expect(screen.getByText("Total for all 12 items")).toBeInTheDocument();
    expect(screen.getByText("Rs. 11,400")).toBeInTheDocument();
  });

  it("shows a dash for fees when the item has no payout yet", async () => {
    mockLedger([
      buildRow({
        grossAmount: null,
        platformFee: null,
        gatewayFee: null,
        brandNetAmount: null,
        brandPayoutStatus: null,
        creatorCommissionAmount: null,
        creatorCommissionStatus: null,
      }),
    ]);
    renderPage();

    await screen.findByText("Dhaka Topi");
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(5);
  });

  it("carries the clicked number's filters into the request", async () => {
    const requestedUrls: URL[] = [];
    mockLedger([buildRow()], requestedUrls);
    renderPage(`${LEDGER_PATH}?range=all&focus=OWED_TO_BRANDS&method=COD`);

    await screen.findByText("Dhaka Topi");
    const { searchParams } = requestedUrls[0] ?? new URL(LEDGER_URL);
    expect(searchParams.get("range")).toBe("all");
    expect(searchParams.get("focus")).toBe("OWED_TO_BRANDS");
    expect(searchParams.get("paymentMethod")).toBe("COD");
  });

  it("re-fetches when a filter changes", async () => {
    const requestedUrls: URL[] = [];
    mockLedger([buildRow()], requestedUrls);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Dhaka Topi");
    await user.selectOptions(screen.getByLabelText("Filter by payment method"), "ESEWA");

    await waitFor(() =>
      expect(requestedUrls.at(-1)?.searchParams.get("paymentMethod")).toBe("ESEWA"),
    );
  });

  it("searches once two letters are typed", async () => {
    const requestedUrls: URL[] = [];
    mockLedger([buildRow()], requestedUrls);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Dhaka Topi");
    await user.type(screen.getByLabelText("Search the ledger"), "as");

    await waitFor(() => expect(requestedUrls.at(-1)?.searchParams.get("search")).toBe("as"));
  });

  it("covers the whole of the picked days and lets dates replace the period", async () => {
    const requestedUrls: URL[] = [];
    mockLedger([buildRow()], requestedUrls);
    renderPage(`${LEDGER_PATH}?from=2026-01-01&to=2026-01-31`);

    await screen.findByText("Dhaka Topi");
    const { searchParams } = requestedUrls[0] ?? new URL(LEDGER_URL);
    expect(searchParams.get("range")).toBeNull();
    expect(searchParams.get("dateFrom")).toBe(new Date(2026, 0, 1).toISOString());
    expect(searchParams.get("dateTo")).toBe(new Date(2026, 0, 31, 23, 59, 59, 999).toISOString());
  });

  it("explains a from date after the to date instead of asking the server", async () => {
    const requestedUrls: URL[] = [];
    mockLedger([buildRow()], requestedUrls);
    renderPage(`${LEDGER_PATH}?from=2026-02-01&to=2026-01-01`);

    expect(await screen.findByText(/must be on or before/)).toBeInTheDocument();
    expect(requestedUrls).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("clears every filter at once", async () => {
    mockLedger([buildRow()]);
    const user = userEvent.setup();
    const { router } = renderPage(`${LEDGER_PATH}?method=COD&focus=REFUNDED`);

    await screen.findByText("Dhaka Topi");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it("appends the next page when Load more is clicked", async () => {
    mswServer.use(
      http.get(LEDGER_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return cursor
          ? ledgerResponse([buildRow({ orderItemId: "item-2", productName: "Pashmina" })])
          : ledgerResponse([buildRow()], "page-2");
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Pashmina")).toBeInTheDocument();
    expect(screen.getByText("Dhaka Topi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("opens the full story of an item when its row is clicked", async () => {
    mockLedger([buildRow()]);
    mswServer.use(
      http.get(`${LEDGER_URL}/item-1`, () =>
        HttpResponse.json({ success: true, message: "ok", data: LEDGER_ITEM }),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Dhaka Topi/ }));

    const panel = await screen.findByRole("dialog");
    expect(await within(panel).findByText("Who placed this order")).toBeInTheDocument();
    expect(within(panel).getByText("Asha Rai (@asha)")).toBeInTheDocument();
    expect(within(panel).getByText("9800000000")).toBeInTheDocument();
    expect(within(panel).getByText("Order cancelled")).toBeInTheDocument();
    expect(within(panel).getByText(/SAVE50/)).toBeInTheDocument();
    expect(within(panel).getByText("Mira Gurung (@mira)")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Open the full order" })).toBeInTheDocument();
  });

  it("explains when an item's story can't load", async () => {
    mockLedger([buildRow()]);
    mswServer.use(
      http.get(`${LEDGER_URL}/item-1`, () =>
        HttpResponse.json({ success: false, message: "nope" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Dhaka Topi/ }));

    expect(await screen.findByText("Couldn't load this item.")).toBeInTheDocument();
  });

  it("downloads the current filter as a CSV", async () => {
    mockLedger([buildRow()]);
    const requestedExports: URL[] = [];
    mswServer.use(
      http.get(`${LEDGER_URL}/export`, ({ request }) => {
        requestedExports.push(new URL(request.url));
        return new HttpResponse("Order ID", { headers: { "Content-Type": "text/csv" } });
      }),
    );
    const createObjectUrl = vi.fn(() => "blob:ledger");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    renderPage(`${LEDGER_PATH}?method=COD`);

    await screen.findByText("Dhaka Topi");
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => expect(createObjectUrl).toHaveBeenCalledOnce());
    expect(requestedExports[0]?.searchParams.get("paymentMethod")).toBe("COD");
  });
});
