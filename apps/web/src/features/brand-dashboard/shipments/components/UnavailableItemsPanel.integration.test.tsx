import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import type { BrandShipmentItem } from "../api/brandFulfilmentSchemas";
import type { UnavailableItemReport } from "../api/unavailableItemSchemas";
import { UnavailableItemsPanel } from "./UnavailableItemsPanel";

const GROUP_ID = "group-1";
const REPORTS_URL = `/api/orders/brand/fulfilment-groups/${GROUP_ID}/unavailable-items`;

const okJson = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: "ok", data }, { status });

const shirt: BrandShipmentItem = {
  id: "item-1",
  productId: "product-1",
  productName: "Linen Shirt",
  imageUrl: null,
  sizeLabel: "M",
  qty: 3,
  refundedQty: 1,
  unitPrice: 800,
  listUnitPrice: 800,
  brandDiscountAmount: 0,
  platformDiscountAmount: 0,
};

const pendingReport: UnavailableItemReport = {
  id: "report-1",
  orderItemId: "item-1",
  productName: "Linen Shirt",
  sizeLabel: "M",
  qty: 1,
  reason: "Damaged in store",
  status: "PENDING",
  decisionNote: null,
  createdAt: "2026-10-16T08:00:00.000Z",
  decidedAt: null,
};

const renderPanel = (canReport: boolean) =>
  render(<UnavailableItemsPanel groupId={GROUP_ID} items={[shirt]} canReport={canReport} />, {
    wrapper: createQueryClientWrapper(),
  });

describe("UnavailableItemsPanel", () => {
  it("explains the option when nothing has been reported yet", async () => {
    mswServer.use(http.get(REPORTS_URL, () => okJson({ requests: [] })));
    renderPanel(true);

    expect(await screen.findByText(/tell us here instead of cancelling/i)).toBeInTheDocument();
  });

  it("lists earlier reports with their review status", async () => {
    mswServer.use(
      http.get(REPORTS_URL, () =>
        okJson({
          requests: [
            pendingReport,
            {
              ...pendingReport,
              id: "report-2",
              status: "REJECTED",
              decisionNote: "Restock arrives tomorrow",
            },
          ],
        }),
      ),
    );
    renderPanel(false);

    expect(await screen.findByText("Waiting for Outfiqe")).toBeInTheDocument();
    expect(screen.getByText("Not approved — please send it")).toBeInTheDocument();
    expect(screen.getByText("Outfiqe: Restock arrives tomorrow")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Can't supply an item" })).not.toBeInTheDocument();
  });

  it("shows nothing once the parcel has left and nothing was reported", async () => {
    let wasFetched = false;
    mswServer.use(
      http.get(REPORTS_URL, () => {
        wasFetched = true;
        return okJson({ requests: [] });
      }),
    );
    const { container } = renderPanel(false);

    await waitFor(() => expect(wasFetched).toBe(true));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("reports only the units still ordered, with a reason", async () => {
    let sentBody: unknown;
    mswServer.use(
      http.get(REPORTS_URL, () => okJson({ requests: [] })),
      http.post(REPORTS_URL, async ({ request }) => {
        sentBody = await request.json();
        return okJson({ requests: [pendingReport] }, 201);
      }),
    );
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(await screen.findByRole("button", { name: "Can't supply an item" }));
    const quantity = screen.getByLabelText("Linen Shirt · M");
    expect(quantity.querySelectorAll("option")).toHaveLength(3);
    const send = screen.getByRole("button", { name: "Send to Outfiqe" });

    await user.selectOptions(quantity, "1");
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText("What happened?"), "Damaged in store");
    await user.click(send);

    await waitFor(() =>
      expect(sentBody).toEqual({
        lines: [{ orderItemId: "item-1", qty: 1 }],
        reason: "Damaged in store",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Send to Outfiqe" })).not.toBeInTheDocument(),
    );
  });

  it("keeps the window open with the server's message when the report is refused", async () => {
    mswServer.use(
      http.get(REPORTS_URL, () => okJson({ requests: [] })),
      http.post(REPORTS_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "One of these items is already waiting for Outfiqe to review.",
            code: "UNAVAILABLE_REQUEST_ALREADY_OPEN",
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(await screen.findByRole("button", { name: "Can't supply an item" }));
    await user.selectOptions(screen.getByLabelText("Linen Shirt · M"), "2");
    await user.type(screen.getByLabelText("What happened?"), "Sold out");
    await user.click(screen.getByRole("button", { name: "Send to Outfiqe" }));

    expect(
      await screen.findByText("One of these items is already waiting for Outfiqe to review."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send to Outfiqe" })).toBeInTheDocument();
  });
});
