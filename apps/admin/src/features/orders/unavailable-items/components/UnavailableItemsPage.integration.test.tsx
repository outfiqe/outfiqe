import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { UnavailableItemsPage } from "./UnavailableItemsPage";

const LIST_URL = "http://localhost:3000/api/orders/admin/unavailable-items";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const pendingRequest = {
  id: "request-1",
  orderId: "order-1",
  fulfilmentGroupId: "group-1",
  orderItemId: "item-1",
  brandName: "Aurora Label",
  productName: "Linen Shirt",
  sizeLabel: "M",
  unitPrice: 1200,
  qty: 2,
  reason: "Last ones were damaged",
  status: "PENDING",
  decisionNote: null,
  refundId: null,
  createdAt: "2026-10-02T00:00:00.000Z",
  decidedAt: null,
};

const renderPage = () =>
  renderWithRouter(
    <>
      <UnavailableItemsPage />
      <Toaster />
    </>,
    { path: "/orders/unavailable-items" },
  );

describe("UnavailableItemsPage", () => {
  it("shows an empty state for a tab with no reports", async () => {
    mswServer.use(http.get(LIST_URL, () => okJson({ items: [], nextCursor: null })));

    renderPage();

    expect(await screen.findByText("Nothing here right now.")).toBeInTheDocument();
  });

  it("approves a report so the customer is refunded", async () => {
    let wasApproved = false;
    mswServer.use(
      http.get(LIST_URL, ({ request }) =>
        okJson({
          items:
            new URL(request.url).searchParams.get("status") === "PENDING" ? [pendingRequest] : [],
          nextCursor: null,
        }),
      ),
      http.post(`${LIST_URL}/request-1/approve`, () => {
        wasApproved = true;
        return okJson({ ...pendingRequest, status: "APPROVED", refundId: "refund-1" });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Aurora Label: Linen Shirt · M × 2")).toBeInTheDocument();
    expect(screen.getByText(/Rs\. 2,400/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve and refund" }));

    await waitFor(() => expect(wasApproved).toBe(true));
  });

  it("rejects a report with a note for the brand", async () => {
    let rejectBody: unknown;
    mswServer.use(
      http.get(LIST_URL, () => okJson({ items: [pendingRequest], nextCursor: null })),
      http.post(`${LIST_URL}/request-1/reject`, async ({ request }) => {
        rejectBody = await request.json();
        return okJson({ ...pendingRequest, status: "REJECTED", decisionNote: "Restock is in" });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Note for the brand"), "Restock is in");
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(rejectBody).toEqual({ note: "Restock is in" }));
  });
});
