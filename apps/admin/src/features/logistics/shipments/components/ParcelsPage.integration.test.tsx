import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildHub, emptyPage, HUBS_URL, okJson } from "../../testing/logisticsFixtures";
import { ParcelLabelPrintPage } from "./ParcelLabelPrintPage";
import { ParcelsPage } from "./ParcelsPage";

const SHIPMENTS_URL = "http://localhost:3000/api/logistics/hub/shipments";

const parcelToBook = {
  shipmentId: "shipment-1",
  orderId: "order-1",
  trackingCode: "OFQ7K2M9QAB",
  displayTrackingCode: "OFQ-7K2M-9QAB",
  status: "PACKED",
  codAmountToCollect: 2400,
  isLabelUpToDate: false,
  recipientName: "Asha Rai",
  city: "Kathmandu",
  packedAt: "2026-10-16T08:00:00.000Z",
  lastEventAt: "2026-10-16T08:00:00.000Z",
  booking: {
    bookingId: "booking-1",
    partnerId: "partner-1",
    partnerName: "Valley Courier",
    status: "REQUESTED",
    connection: "MANUAL",
    merchantReference: "OFQ7K2M9QAB",
    partnerReference: null,
    partnerTrackingUrl: null,
    failureReason: null,
  },
};

const parcelLabel = {
  shipmentId: "shipment-1",
  trackingCode: "OFQ7K2M9QAB",
  displayTrackingCode: "OFQ-7K2M-9QAB",
  orderId: "order-1",
  status: "PACKED",
  currency: "NPR",
  codAmountToCollect: 2400,
  isLabelUpToDate: false,
  labelPrintedAt: null,
  weightGrams: 900,
  parcelCount: 1,
  packedAt: "2026-10-16T08:00:00.000Z",
  recipient: {
    fullName: "Asha Rai",
    phone: "+9779812345678",
    address: "Baneshwor",
    city: "Kathmandu",
    landmark: null,
  },
  sender: {
    name: "Kathmandu Hub",
    address: "Teku Road",
    city: "Kathmandu",
    phone: "+9779800000001",
  },
  partner: {
    name: "Valley Courier",
    partnerReference: "PX-55821",
    partnerLabelUrl: null,
    status: "BOOKED",
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ParcelsPage", () => {
  it("shows an empty state for a queue with no parcels", async () => {
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(SHIPMENTS_URL, () => okJson(emptyPage)),
    );

    renderWithRouter(<ParcelsPage />, { path: "/logistics/parcels" });

    expect(await screen.findByText("Every packed parcel is booked.")).toBeInTheDocument();
  });

  it("saves the partner's parcel number for a parcel waiting to be booked", async () => {
    let bookingBody: unknown;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(SHIPMENTS_URL, () => okJson({ items: [parcelToBook], nextCursor: null })),
      http.post(`${SHIPMENTS_URL}/shipment-1/booking`, async ({ request }) => {
        bookingBody = await request.json();
        return okJson({ ...parcelToBook.booking, status: "BOOKED", partnerReference: "PX-55821" });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <ParcelsPage />
        <Toaster />
      </>,
      { path: "/logistics/parcels" },
    );

    expect(await screen.findByText("OFQ-7K2M-9QAB")).toBeInTheDocument();
    expect(screen.getByText("Label needs printing")).toBeInTheDocument();
    expect(screen.getByText(/collect Rs\. 2,400/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Valley Courier's parcel number"), "PX-55821");
    await user.click(screen.getByRole("button", { name: "Save booking" }));

    await waitFor(() => expect(bookingBody).toEqual({ partnerReference: "PX-55821" }));
  });

  it("waits for a connected partner instead of asking for their number", async () => {
    const parcelBeingBooked = {
      ...parcelToBook,
      booking: { ...parcelToBook.booking, connection: "API" },
    };
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(SHIPMENTS_URL, () => okJson({ items: [parcelBeingBooked], nextCursor: null })),
    );

    renderWithRouter(<ParcelsPage />, { path: "/logistics/parcels" });

    expect(await screen.findByText(/Booking with Valley Courier/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Valley Courier's parcel number")).not.toBeInTheDocument();
  });

  it("shows why a connected partner's booking failed and tries it again", async () => {
    let wasRetried = false;
    const parcelWithFailedBooking = {
      ...parcelToBook,
      booking: {
        ...parcelToBook.booking,
        connection: "API",
        status: "BOOKING_FAILED",
        failureReason: "The partner answered 422.",
      },
    };
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(SHIPMENTS_URL, () => okJson({ items: [parcelWithFailedBooking], nextCursor: null })),
      http.post(`${SHIPMENTS_URL}/shipment-1/booking/retry`, () => {
        wasRetried = true;
        return okJson({
          ...parcelWithFailedBooking.booking,
          status: "REQUESTED",
          failureReason: null,
        });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <ParcelsPage />
        <Toaster />
      </>,
      { path: "/logistics/parcels" },
    );

    expect(await screen.findByText(/The partner answered 422\./)).toBeInTheDocument();
    expect(screen.getByLabelText("Valley Courier's parcel number")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(wasRetried).toBe(true));
  });
});

describe("ParcelLabelPrintPage", () => {
  it("shows the cash to collect and records the label as printed", async () => {
    let wasMarkedPrinted = false;
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    mswServer.use(
      http.get(`${SHIPMENTS_URL}/shipment-1/label`, () => okJson(parcelLabel)),
      http.post(`${SHIPMENTS_URL}/shipment-1/label-printed`, () => {
        wasMarkedPrinted = true;
        return okJson({ ...parcelLabel, isLabelUpToDate: true });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<ParcelLabelPrintPage shipmentId="shipment-1" />, {
      path: "/logistics/parcels/shipment-1/label",
    });

    expect(await screen.findByText("NPR 2,400")).toBeInTheDocument();
    expect(screen.getByText("Asha Rai")).toBeInTheDocument();
    expect(screen.getByText(/Valley Courier · PX-55821/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Print label" }));

    expect(printSpy).toHaveBeenCalled();
    await waitFor(() => expect(wasMarkedPrinted).toBe(true));
  });
});
