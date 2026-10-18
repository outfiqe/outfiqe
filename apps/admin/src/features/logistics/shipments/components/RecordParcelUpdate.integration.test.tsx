import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { okJson } from "../../testing/logisticsFixtures";
import { ParcelDetailPage } from "./ParcelDetailPage";

const PARCEL_URL = "http://localhost:3000/api/logistics/hub/shipments/shipment-1";

const parcelOutForDelivery = {
  shipmentId: "shipment-1",
  orderId: "order-1",
  trackingCode: "OFQ7K2M9QAB",
  displayTrackingCode: "OFQ-7K2M-9QAB",
  status: "OUT_FOR_DELIVERY",
  codAmountToCollect: 1100,
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
  deliveryAttemptCount: 0,
  deliveredAt: null,
  codCollectedAmount: null,
  codRemittanceId: null,
  labelPrintedAt: "2026-10-16T08:00:00.000Z",
  returnOutcome: null,
  returnCheckedInAt: null,
  partnerClaimAmount: null,
  partnerClaimStatus: null,
  pickups: [],
  events: [],
};

describe("recording a parcel update", () => {
  it("asks how much cash the partner collected when the parcel is delivered", async () => {
    let updateBody: unknown;
    mswServer.use(
      http.get(PARCEL_URL, () => okJson(parcelOutForDelivery)),
      http.post(`${PARCEL_URL}/events`, async ({ request }) => {
        updateBody = await request.json();
        return okJson({ ...parcelOutForDelivery, status: "DELIVERED", codCollectedAmount: 1000 });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<ParcelDetailPage shipmentId="shipment-1" />, {
      path: "/logistics/parcels/shipment-1",
    });

    await user.click(await screen.findByRole("button", { name: "Record an update" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText("Cash the partner collected")).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText("What happened"), "DELIVERED");
    const cashField = within(dialog).getByLabelText("Cash the partner collected");
    expect(cashField).toHaveValue(1100);
    await user.clear(cashField);
    await user.type(cashField, "1000");
    await user.type(within(dialog).getByLabelText("Note"), "Customer paid short");
    await user.click(within(dialog).getByRole("button", { name: "Save update" }));

    await waitFor(() =>
      expect(updateBody).toEqual({
        code: "DELIVERED",
        note: "Customer paid short",
        isCorrection: false,
        codCollectedAmount: 1000,
      }),
    );
  });

  it("shows what the partner collected and whether it has been paid in", async () => {
    mswServer.use(
      http.get(PARCEL_URL, () =>
        okJson({
          ...parcelOutForDelivery,
          status: "DELIVERED",
          deliveredAt: "2026-10-17T10:00:00.000Z",
          codCollectedAmount: 1100,
        }),
      ),
    );
    renderWithRouter(<ParcelDetailPage shipmentId="shipment-1" />, {
      path: "/logistics/parcels/shipment-1",
    });

    expect(
      await screen.findByText("Partner collected Rs. 1,100 · not paid in yet"),
    ).toBeInTheDocument();
  });
});
