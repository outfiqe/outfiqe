import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BrandCancellationRequests } from "./BrandCancellationRequests";

const LIST_URL = "http://localhost:3000/api/orders/admin/cancellation-requests";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const cancellationRequest = {
  fulfilmentGroupId: "group-1",
  orderId: "abcdef12-0000-4000-8000-000000000000",
  brandName: "Aurora Label",
  groupStatus: "PACKED",
  reason: "Ran out of stock before packing",
  requestedAt: "2026-11-20T10:00:00.000Z",
  remainingAmount: 2400,
  items: [
    {
      orderItemId: "item-1",
      productName: "Linen Shirt",
      sizeLabel: "M",
      unitPrice: 1200,
      qty: 3,
      refundedQty: 1,
    },
  ],
};

const renderSection = () =>
  renderWithRouter(
    <>
      <BrandCancellationRequests />
      <Toaster />
    </>,
    { path: "/orders/unavailable-items" },
  );

describe("BrandCancellationRequests", () => {
  it("shows an empty state when no brand is asking to cancel", async () => {
    mswServer.use(http.get(LIST_URL, () => okJson({ items: [], nextCursor: null })));

    renderSection();

    expect(await screen.findByText("No cancellation requests right now.")).toBeInTheDocument();
  });

  it("shows an error message when the requests can't be loaded", async () => {
    mswServer.use(http.get(LIST_URL, () => HttpResponse.json({ success: false }, { status: 500 })));

    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load cancellation requests.",
    );
  });

  it("shows the order reference, brand, remaining items, amount and reason", async () => {
    mswServer.use(
      http.get(LIST_URL, () => okJson({ items: [cancellationRequest], nextCursor: null })),
    );

    renderSection();

    expect(await screen.findByText("Order #ABCDEF12 · Aurora Label")).toBeInTheDocument();
    expect(screen.getByText("Linen Shirt · M × 2")).toBeInTheDocument();
    expect(screen.getByText(/Rs\. 2,400 left to refund/)).toBeInTheDocument();
    expect(screen.getByText("Reason: Ran out of stock before packing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open order" })).toHaveAttribute(
      "href",
      `/orders/${cancellationRequest.orderId}`,
    );
  });

  it("approves only after the staff member confirms the refund", async () => {
    let wasApproved = false;
    mswServer.use(
      http.get(LIST_URL, () => okJson({ items: [cancellationRequest], nextCursor: null })),
      http.post(`${LIST_URL}/group-1/approve`, () => {
        wasApproved = true;
        return okJson({
          fulfilmentGroupId: "group-1",
          orderId: cancellationRequest.orderId,
          decision: "APPROVED",
        });
      }),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Approve and refund" }));
    expect(wasApproved).toBe(false);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Approve and refund" }));

    await waitFor(() => expect(wasApproved).toBe(true));
  });

  it("declines a request with a note for the brand", async () => {
    let rejectBody: unknown;
    mswServer.use(
      http.get(LIST_URL, () => okJson({ items: [cancellationRequest], nextCursor: null })),
      http.post(`${LIST_URL}/group-1/reject`, async ({ request }) => {
        rejectBody = await request.json();
        return okJson({
          fulfilmentGroupId: "group-1",
          orderId: cancellationRequest.orderId,
          decision: "REJECTED",
        });
      }),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Note for the brand"), "Stock found at the hub");
    await user.click(within(dialog).getByRole("button", { name: "Decline" }));

    await waitFor(() => expect(rejectBody).toEqual({ note: "Stock found at the hub" }));
  });
});
