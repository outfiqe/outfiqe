import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { buildHub, emptyPage, HUBS_URL, okJson } from "../../testing/logisticsFixtures";
import { PackingPage } from "./PackingPage";

const HUB_API_BASE = "http://localhost:3000/api/logistics/hub";

const buildOrderToPack = (overrides: Record<string, unknown> = {}) => ({
  orderId: "order-1234-abcd",
  placedAt: "2026-10-16T04:00:00.000Z",
  customerName: "Asha Rai",
  city: "Kathmandu",
  paymentMethod: "COD",
  pickupsStillComing: 0,
  pickupsAtHub: [
    {
      fulfilmentGroupId: "group-1",
      brandName: "Kathmandu Knits",
      isInspected: false,
      items: [
        {
          orderItemId: "item-1",
          productName: "Wool Scarf",
          sizeLabel: "One size",
          units: 2,
          inspectionStatus: "NOT_INSPECTED",
          failedQty: 0,
        },
      ],
    },
  ],
  otherPickups: [],
  ...overrides,
});

const renderPacking = () =>
  renderWithRouter(
    <>
      <PackingPage />
      <Toaster />
    </>,
    { path: "/logistics/packing" },
  );

describe("PackingPage", () => {
  it("shows an empty state when nothing is at the hub", async () => {
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(`${HUB_API_BASE}/orders-to-pack`, () => okJson(emptyPage)),
    );

    renderPacking();

    expect(await screen.findByText(/Nothing to pack/)).toBeInTheDocument();
  });

  it("inspects a bag, recording a failed unit, before packing is allowed", async () => {
    let inspectionBody: unknown;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(`${HUB_API_BASE}/orders-to-pack`, () =>
        okJson({ items: [buildOrderToPack()], nextCursor: null }),
      ),
      http.post(`${HUB_API_BASE}/pickups/group-1/inspection`, async ({ request }) => {
        inspectionBody = await request.json();
        return okJson({
          fulfilmentGroupId: "group-1",
          orderId: "order-1234-abcd",
          failedUnits: 1,
          refundId: "refund-1",
          pickupStatus: "AT_HUB",
        });
      }),
    );
    const user = userEvent.setup();
    renderPacking();

    expect(await screen.findByRole("button", { name: "Pack parcel" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Inspect" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/Wool Scarf/), "1");
    await user.click(within(dialog).getByRole("button", { name: "Save and refund" }));

    await waitFor(() =>
      expect(inspectionBody).toEqual({ lines: [{ orderItemId: "item-1", failedQty: 1 }] }),
    );
  });

  it("asks before packing only the bags that have arrived", async () => {
    let packBody: unknown;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(`${HUB_API_BASE}/orders-to-pack`, () =>
        okJson({
          items: [
            buildOrderToPack({
              pickupsStillComing: 1,
              pickupsAtHub: [
                {
                  ...buildOrderToPack().pickupsAtHub[0],
                  isInspected: true,
                },
              ],
              otherPickups: [
                {
                  fulfilmentGroupId: "group-2",
                  brandName: "Patan Prints",
                  pickupStatus: "PICKED_UP",
                },
              ],
            }),
          ],
          nextCursor: null,
        }),
      ),
      http.post(`${HUB_API_BASE}/orders/order-1234-abcd/parcels`, async ({ request }) => {
        packBody = await request.json();
        return okJson(
          {
            shipmentId: "shipment-1",
            trackingCode: "OFQ7K2M9QAB",
            status: "PACKED",
            codAmountToCollect: 1200,
            fulfilmentGroupIds: ["group-1"],
            booking: null,
          },
          201,
        );
      }),
    );
    const user = userEvent.setup();
    renderPacking();

    expect(await screen.findByText(/Patan Prints \(On the way to the hub\)/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pack parcel" }));
    const dialog = await screen.findByRole("dialog");
    const packButton = within(dialog).getByRole("button", { name: "Pack parcel" });
    expect(packButton).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(packButton);

    await waitFor(() =>
      expect(packBody).toEqual({
        partnerId: null,
        weightGrams: 1000,
        parcelCount: 1,
        packsOnlyPickupsAtHub: true,
      }),
    );
    expect(await screen.findByText(/Packed as OFQ-7K2M-9QAB/)).toBeInTheDocument();
  });
});
