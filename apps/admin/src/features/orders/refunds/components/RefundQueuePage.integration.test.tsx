import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import {
  grantEveryPlatformPermission,
  grantOnlyPlatformPermissions,
} from "@test/platformPermissionsMock";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { RefundQueuePage } from "./RefundQueuePage";

const QUEUE_URL = "http://localhost:3000/api/orders/admin/refunds";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const bankRefund = {
  id: "refund-1",
  orderId: "order-1",
  customerName: "Asha Rai",
  customerPhone: "9800000000",
  paymentMethod: "ESEWA",
  cause: "BRAND_UNAVAILABLE",
  reason: "Out of stock",
  status: "NEEDS_MANUAL",
  method: null,
  goodsAmount: 1500,
  feeAmount: 0,
  totalAmount: 1500,
  transferReference: null,
  createdAt: "2026-10-02T00:00:00.000Z",
  settledAt: null,
  lines: [],
  destination: {
    kind: "BANK",
    walletId: null,
    bankName: "Nabil Bank",
    accountName: "Asha Rai",
    accountNumberLast4: "8901",
    updatedAt: "2026-10-02T00:00:00.000Z",
  },
};

const refundAwaitingDetails = {
  ...bankRefund,
  id: "refund-2",
  customerName: "Bikash Thapa",
  destination: null,
};

const renderQueue = () =>
  renderWithRouter(
    <>
      <RefundQueuePage />
      <Toaster />
    </>,
    { path: "/orders/refunds" },
  );

afterEach(() => {
  grantEveryPlatformPermission();
});

describe("RefundQueuePage", () => {
  it("shows an empty state when nothing is waiting", async () => {
    mswServer.use(http.get(QUEUE_URL, () => okJson({ items: [], nextCursor: null })));

    renderQueue();

    expect(await screen.findByText("No refunds waiting to be paid.")).toBeInTheDocument();
  });

  it("reveals a bank account number and marks the refund paid with a transfer reference", async () => {
    let markPaidBody: unknown;
    mswServer.use(
      http.get(QUEUE_URL, () =>
        okJson({ items: [bankRefund, refundAwaitingDetails], nextCursor: null }),
      ),
      http.get(`${QUEUE_URL}/refund-1/account-number`, () =>
        okJson({ accountNumber: "01234567898901" }),
      ),
      http.post(`${QUEUE_URL}/refund-1/mark-paid`, async ({ request }) => {
        markPaidBody = await request.json();
        return okJson({ ...bankRefund, status: "SUCCEEDED", method: "MANUAL_TRANSFER" });
      }),
    );
    const user = userEvent.setup();
    renderQueue();

    const bankCard = (await screen.findByText("Rs. 1,500 to Asha Rai")).closest("article");
    const waitingCard = screen.getByText("Rs. 1,500 to Bikash Thapa").closest("article");
    if (!bankCard || !waitingCard) throw new Error("Refund cards did not render");

    expect(within(waitingCard).getByText(/Waiting for the customer/)).toBeInTheDocument();
    expect(within(waitingCard).getByRole("button", { name: "Mark as paid" })).toBeDisabled();

    expect(within(bankCard).getByText("Nabil Bank · ending 8901")).toBeInTheDocument();
    await user.click(within(bankCard).getByRole("button", { name: "Show full account number" }));
    expect(await within(bankCard).findByText("Nabil Bank · 01234567898901")).toBeInTheDocument();

    await user.click(within(bankCard).getByRole("button", { name: "Mark as paid" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Transfer reference"), "NBL-77821");
    await user.click(within(dialog).getByRole("button", { name: "Mark as paid" }));

    await waitFor(() => expect(markPaidBody).toEqual({ transferReference: "NBL-77821" }));
  });

  it("hides the pay action from staff who can only view orders", async () => {
    grantOnlyPlatformPermissions("platform:orders:read");
    mswServer.use(http.get(QUEUE_URL, () => okJson({ items: [bankRefund], nextCursor: null })));

    renderQueue();

    expect(await screen.findByText("Rs. 1,500 to Asha Rai")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as paid" })).not.toBeInTheDocument();
  });
});
