import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { emptyPage, LOGISTICS_API_BASE, okJson } from "../../testing/logisticsFixtures";
import { CodPage } from "./CodPage";

const COD_URL = `${LOGISTICS_API_BASE}/cod`;

const partnerHoldingCash = {
  partnerId: "partner-1",
  partnerName: "Valley Couriers",
  currency: "NPR",
  codRemittanceDays: 7,
  unremittedParcelCount: 2,
  unremittedAmount: 2000,
  overdueParcelCount: 1,
  overdueAmount: 1100,
  oldestDeliveredAt: "2026-10-05T08:00:00.000Z",
};

const buildParcel = (overrides: Record<string, unknown>) => ({
  shipmentId: "parcel-1",
  trackingCode: "OFQ7K2M9QAB",
  orderId: "order-1",
  currency: "NPR",
  partnerReference: "VC-1001",
  quotedPartnerFee: 100,
  expectedAmount: 1100,
  collectedAmount: 1100,
  hasCashMismatch: false,
  deliveredAt: "2026-10-05T08:00:00.000Z",
  remitBy: "2026-10-12T08:00:00.000Z",
  isOverdue: true,
  ...overrides,
});

const recordedPayment = {
  id: "remittance-1",
  partnerId: "partner-1",
  partnerName: "Valley Couriers",
  reference: "NIC-778",
  currency: "NPR",
  receivedAt: "2026-10-17T00:00:00.000Z",
  collectedAmount: 1100,
  partnerFeeAmount: 100,
  receivedAmount: 1000,
  parcelCount: 1,
  recordedByName: "Finance",
  createdAt: "2026-10-17T09:00:00.000Z",
  note: null,
  lines: [],
};

describe("CodPage", () => {
  it("records a payment for the ticked parcels, less the partner fee", async () => {
    let paymentBody: unknown;
    mswServer.use(
      http.get(`${COD_URL}/summary`, () => okJson({ partners: [partnerHoldingCash] })),
      http.get(`${COD_URL}/parcels`, () =>
        okJson({
          items: [
            buildParcel({}),
            buildParcel({
              shipmentId: "parcel-2",
              trackingCode: "OFQ9ZZZ1QAB",
              collectedAmount: 850,
              expectedAmount: 900,
              hasCashMismatch: true,
              isOverdue: false,
            }),
          ],
          nextCursor: null,
        }),
      ),
      http.get(`${COD_URL}/remittances`, () => okJson(emptyPage)),
      http.post(`${COD_URL}/remittances`, async ({ request }) => {
        paymentBody = await request.json();
        return okJson(recordedPayment, 201);
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<CodPage />, { path: "/logistics/cod" });

    expect(await screen.findByText("Valley Couriers")).toBeInTheDocument();
    expect(screen.getByText("1 overdue")).toBeInTheDocument();
    expect(await screen.findByText("Label said Rs. 900")).toBeInTheDocument();
    expect(screen.getByText("No payments recorded from this partner yet.")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Include parcel OFQ7K2M9QAB"));
    expect(screen.getByLabelText("Partner fee for parcel OFQ7K2M9QAB")).toHaveValue(100);
    expect(screen.getByText(/1 parcels ticked · Rs. 1,000 expected/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Amount received")).toHaveValue(1000);
    await user.type(within(dialog).getByLabelText("Bank or transfer reference"), "NIC-778");
    await user.click(within(dialog).getByRole("button", { name: "Record payment" }));

    await waitFor(() =>
      expect(paymentBody).toMatchObject({
        partnerId: "partner-1",
        reference: "NIC-778",
        receivedAmount: 1000,
        lines: [{ shipmentId: "parcel-1", partnerFeeAmount: 100 }],
      }),
    );
  });

  it("warns before saving an amount that doesn't match the ticked parcels", async () => {
    mswServer.use(
      http.get(`${COD_URL}/summary`, () => okJson({ partners: [partnerHoldingCash] })),
      http.get(`${COD_URL}/parcels`, () => okJson({ items: [buildParcel({})], nextCursor: null })),
      http.get(`${COD_URL}/remittances`, () => okJson(emptyPage)),
    );
    const user = userEvent.setup();
    renderWithRouter(<CodPage />, { path: "/logistics/cod" });

    await user.click(await screen.findByLabelText("Include parcel OFQ7K2M9QAB"));
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog");
    const amountField = within(dialog).getByLabelText("Amount received");
    await user.clear(amountField);
    await user.type(amountField, "900");

    expect(
      within(dialog).getByText(/The ticked parcels come to Rs. 1,000 after fees/),
    ).toBeInTheDocument();
  });

  it("says so when no partner holds cash", async () => {
    mswServer.use(http.get(`${COD_URL}/summary`, () => okJson({ partners: [] })));
    renderWithRouter(<CodPage />, { path: "/logistics/cod" });

    expect(
      await screen.findByText("No partner is holding cash for us right now."),
    ).toBeInTheDocument();
  });
});
