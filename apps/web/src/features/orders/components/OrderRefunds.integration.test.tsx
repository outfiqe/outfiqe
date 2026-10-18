import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { OrderItem } from "../api/orderSchemas";
import type { MyRefundDestination } from "../api/refundSchemas";
import { CancelItemsModal } from "./CancelItemsModal";
import { OrderRefundsSection } from "./OrderRefundsSection";
import { RefundDetailsCard } from "./RefundDetailsCard";

vi.mock("@/features/nepal-banks", () => ({
  useNepalBanks: () => ({ data: [{ id: "bank-1", name: "Nabil Bank" }] }),
}));

const ORDER_ID = "order-1";
const okJson = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: "ok", data }, { status });

const refund = {
  id: "refund-1",
  cause: "BRAND_UNAVAILABLE",
  reason: "Out of stock",
  status: "SUCCEEDED",
  method: "CASH_NOT_COLLECTED",
  goodsAmount: 600,
  feeAmount: 0,
  totalAmount: 600,
  createdAt: "2026-10-16T08:00:00.000Z",
  settledAt: "2026-10-16T08:00:00.000Z",
  lines: [
    { orderItemId: "item-1", productName: "Linen Shirt", sizeLabel: "M", qty: 1, amount: 600 },
  ],
};

const cancellableItem: OrderItem = {
  id: "item-1",
  productId: "product-1",
  productName: "Linen Shirt",
  brandName: "Brand",
  imageUrl: null,
  sizeLabel: "M",
  qty: 2,
  unitPrice: 600,
  attributedCreatorName: null,
  refundedQty: 0,
  canCancel: true,
};

const awaitingDetails: MyRefundDestination = {
  amountAwaitingDetails: 1200,
  canEdit: true,
  suggestedKind: "ESEWA",
  suggestedWalletId: "9800000000",
  suggestedAccountName: "Asha Shrestha",
  destination: null,
};

describe("OrderRefundsSection", () => {
  it("lists each refund with how the money came back", async () => {
    mswServer.use(http.get(`/api/orders/${ORDER_ID}/refunds`, () => okJson({ refunds: [refund] })));
    render(<OrderRefundsSection orderId={ORDER_ID} />, { wrapper: createQueryClientWrapper() });

    expect(await screen.findByText("Rs. 600")).toBeInTheDocument();
    expect(screen.getByText("Taken off what you pay on delivery")).toBeInTheDocument();
    expect(screen.getByText("The brand couldn't supply it")).toBeInTheDocument();
    expect(screen.getByText("Linen Shirt · M × 1")).toBeInTheDocument();
  });
});

describe("CancelItemsModal", () => {
  it("cancels the chosen units with an idempotency key", async () => {
    let sentBody: unknown;
    let sentKey: string | null = null;
    mswServer.use(
      http.post(`/api/orders/${ORDER_ID}/line-cancellations`, async ({ request }) => {
        sentBody = await request.json();
        sentKey = request.headers.get("Idempotency-Key");
        return okJson(refund, 201);
      }),
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CancelItemsModal
        orderId={ORDER_ID}
        cancellableItems={[cancellableItem]}
        onClose={onClose}
      />,
      { wrapper: createQueryClientWrapper() },
    );

    expect(screen.getByRole("button", { name: "Cancel chosen items" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Linen Shirt · M"), "1");
    await user.click(screen.getByRole("button", { name: "Cancel chosen items" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sentBody).toEqual({ lines: [{ orderItemId: "item-1", qty: 1 }] });
    expect(sentKey).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("RefundDetailsCard", () => {
  it("prefills the suggested wallet and sends the details once ownership is confirmed", async () => {
    let sentBody: unknown;
    mswServer.use(
      http.put(`/api/orders/${ORDER_ID}/refund-destination`, async ({ request }) => {
        sentBody = await request.json();
        return okJson({
          ...awaitingDetails,
          destination: {
            kind: "ESEWA",
            walletId: "9800000000",
            bankId: null,
            bankName: null,
            accountName: "Asha Shrestha",
            accountNumberLast4: null,
            updatedAt: "2026-10-16T08:00:00.000Z",
          },
        });
      }),
    );
    const user = userEvent.setup();
    render(<RefundDetailsCard orderId={ORDER_ID} refundDestination={awaitingDetails} />, {
      wrapper: createQueryClientWrapper(),
    });

    expect(
      screen.getByRole("heading", { name: "Where should we send your Rs. 1,200 refund?" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("eSewa ID (mobile number)")).toHaveValue("9800000000");
    const submit = screen.getByRole("button", { name: "Send refund details" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByLabelText("This account is mine"));
    await user.click(submit);

    await waitFor(() =>
      expect(sentBody).toEqual({
        kind: "ESEWA",
        walletId: "9800000000",
        accountName: "Asha Shrestha",
        confirmsOwnership: true,
      }),
    );
  });

  it("asks for a bank and account number when paying to a bank", async () => {
    const user = userEvent.setup();
    render(<RefundDetailsCard orderId={ORDER_ID} refundDestination={awaitingDetails} />, {
      wrapper: createQueryClientWrapper(),
    });

    await user.selectOptions(screen.getByLabelText("Send it to"), "BANK");

    expect(screen.getByLabelText("Bank")).toBeInTheDocument();
    expect(screen.getByLabelText("Account number")).toBeInTheDocument();
    expect(screen.queryByLabelText("eSewa ID (mobile number)")).not.toBeInTheDocument();
  });

  it("shows saved details read-only once the refund is paid", () => {
    render(
      <RefundDetailsCard
        orderId={ORDER_ID}
        refundDestination={{
          ...awaitingDetails,
          amountAwaitingDetails: 0,
          canEdit: false,
          destination: {
            kind: "BANK",
            walletId: null,
            bankId: "bank-1",
            bankName: "Nabil Bank",
            accountName: "Asha Shrestha",
            accountNumberLast4: "8901",
            updatedAt: "2026-10-16T08:00:00.000Z",
          },
        }}
      />,
      { wrapper: createQueryClientWrapper() },
    );

    expect(screen.getByText("Nabil Bank account ending 8901")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
  });
});
