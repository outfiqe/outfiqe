import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { okJson } from "../../testing/logisticsFixtures";
import { ParcelDetailPage } from "./ParcelDetailPage";

const PARCEL_URL = "http://localhost:3000/api/logistics/hub/shipments/shipment-1";

const parcelOnItsWayBack = {
  shipmentId: "shipment-1",
  orderId: "order-1",
  trackingCode: "OFQ7K2M9QAB",
  displayTrackingCode: "OFQ-7K2M-9QAB",
  status: "RETURNING",
  codAmountToCollect: 0,
  isLabelUpToDate: true,
  recipientName: "Asha Rai",
  city: "Kathmandu",
  packedAt: "2026-10-16T08:00:00.000Z",
  lastEventAt: "2026-10-17T08:00:00.000Z",
  booking: null,
  hubId: "hub-1",
  currency: "NPR",
  weightGrams: 900,
  parcelCount: 1,
  deliveryAttemptCount: 2,
  deliveredAt: null,
  labelPrintedAt: "2026-10-16T08:00:00.000Z",
  returnOutcome: null,
  returnCheckedInAt: null,
  partnerClaimAmount: null,
  partnerClaimStatus: null,
  pickups: [
    {
      fulfilmentGroupId: "group-1",
      brandName: "Thread Co",
      items: [{ orderItemId: "item-1", productName: "Linen Shirt", sizeLabel: "M", units: 2 }],
    },
  ],
  events: [],
};

describe("checking in a returned parcel", () => {
  it("records why it came back and grades each unit", async () => {
    let checkInBody: unknown;
    mswServer.use(
      http.get(PARCEL_URL, () => okJson(parcelOnItsWayBack)),
      http.post(`${PARCEL_URL}/return-check-in`, async ({ request }) => {
        checkInBody = await request.json();
        return okJson({
          shipmentId: "shipment-1",
          outcome: "WRONG_OR_DAMAGED_ITEM",
          refundId: "refund-1",
          brandReturnIds: ["return-1"],
          recordedRefusal: false,
          partnerClaimAmount: null,
        });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <ParcelDetailPage shipmentId="shipment-1" />
        <Toaster />
      </>,
      { path: "/logistics/parcels/shipment-1" },
    );

    await user.click(await screen.findByRole("button", { name: "Check in return" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Linen Shirt/)).toHaveValue("2");
    await user.selectOptions(
      within(dialog).getByLabelText("Why it came back"),
      "WRONG_OR_DAMAGED_ITEM",
    );
    expect(within(dialog).getByLabelText(/Linen Shirt/)).toHaveValue("0");
    await user.selectOptions(within(dialog).getByLabelText(/Linen Shirt/), "1");
    await user.click(within(dialog).getByRole("button", { name: "Check in return" }));

    await waitFor(() =>
      expect(checkInBody).toEqual({
        outcome: "WRONG_OR_DAMAGED_ITEM",
        lines: [{ orderItemId: "item-1", resellableQty: 1, damagedQty: 1 }],
      }),
    );
  });

  it("shows what was decided once the return is checked in", async () => {
    mswServer.use(
      http.get(PARCEL_URL, () =>
        okJson({
          ...parcelOnItsWayBack,
          status: "RETURNED_TO_HUB",
          returnOutcome: "PARTNER_DAMAGED_OR_LOST",
          returnCheckedInAt: "2026-10-17T09:00:00.000Z",
          partnerClaimAmount: 2000,
          partnerClaimStatus: "OPEN",
        }),
      ),
    );
    renderWithRouter(<ParcelDetailPage shipmentId="shipment-1" />, {
      path: "/logistics/parcels/shipment-1",
    });

    expect(await screen.findByText(/Damaged by the delivery partner/)).toBeInTheDocument();
    expect(screen.getByText(/Rs. 2,000/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check in return" })).not.toBeInTheDocument();
  });
});
