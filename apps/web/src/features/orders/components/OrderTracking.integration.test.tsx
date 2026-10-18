import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { OrderTrackingStageSummary } from "../api/orderSchemas";
import { OrderTrackingTimeline } from "./OrderTrackingTimeline";

const socketHandlers = vi.hoisted(() => new Map<string, (payload: unknown) => void>());

vi.mock("@/shared/lib/socketClient", () => ({
  acquireSocketConnection: () => ({
    on: (event: string, handler: (payload: unknown) => void) => socketHandlers.set(event, handler),
    off: vi.fn(),
  }),
  releaseSocketConnection: vi.fn(),
}));

const ORDER_ID = "order-1";
const TRACKING_URL = `/api/logistics/orders/${ORDER_ID}/tracking`;
const DISPUTE_URL = `/api/logistics/orders/${ORDER_ID}/delivery-disputes`;

const okJson = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: "ok", data }, { status });

const deliveredParcel = {
  shipmentId: "shipment-1",
  trackingCode: "OFQ-7K2M-9QAB",
  status: "DELIVERED",
  partnerName: "Valley Courier",
  partnerTrackingUrl: "https://valley.example/t/PX-1",
  deliveredAt: "2026-10-17T08:00:00.000Z",
  canReportNotReceived: true,
  isReportedNotReceived: false,
};

const outForDeliveryStage: OrderTrackingStageSummary = {
  stage: "OUT_FOR_DELIVERY",
  collectedBrandCount: 2,
  totalBrandCount: 2,
};

const tracking = {
  stage: outForDeliveryStage,
  parcels: [{ ...deliveredParcel, status: "OUT_FOR_DELIVERY", canReportNotReceived: false }],
  events: [
    {
      id: "event-2",
      code: "DELIVERY_FAILED",
      occurredAt: "2026-10-17T06:00:00.000Z",
      brandName: null,
      location: null,
      reasonCode: "CUSTOMER_UNREACHABLE",
      shipmentId: "shipment-1",
    },
    {
      id: "event-1",
      code: "PICKED_UP",
      occurredAt: "2026-10-16T06:00:00.000Z",
      brandName: "Thread Co",
      location: null,
      reasonCode: null,
      shipmentId: null,
    },
  ],
};

const renderTimeline = (stage: OrderTrackingStageSummary = outForDeliveryStage) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <>
      <OrderTrackingTimeline
        orderId={ORDER_ID}
        trackingStage={stage}
        promisedDelivery={{ from: "2026-10-18", by: "2026-10-19" }}
      />
      <Toaster />
    </>,
    { wrapper: Wrapper },
  );
};

describe("OrderTrackingTimeline", () => {
  it("shows the stage, the promise, the partner link and what happened, newest first", async () => {
    mswServer.use(http.get(TRACKING_URL, () => okJson(tracking)));
    renderTimeline();

    expect(screen.getByText("Out for delivery")).toBeInTheDocument();
    expect(screen.getByText("Expected 2026-10-18 to 2026-10-19")).toBeInTheDocument();
    expect(await screen.findByText("Delivery attempt missed")).toBeInTheDocument();
    expect(screen.getByText("The rider couldn't reach you")).toBeInTheDocument();
    expect(screen.getByText(/Thread Co/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Track with Valley Courier/ })).toHaveAttribute(
      "href",
      "https://valley.example/t/PX-1",
    );
    expect(screen.queryByRole("button", { name: "I didn't receive this" })).not.toBeInTheDocument();
  });

  it("refreshes when an update for this order arrives", async () => {
    let trackingRequestCount = 0;
    mswServer.use(
      http.get(TRACKING_URL, () => {
        trackingRequestCount += 1;
        return okJson(tracking);
      }),
    );
    renderTimeline();
    await screen.findByText("Delivery attempt missed");

    act(() => {
      socketHandlers.get("notification:created")?.({
        type: "ORDER_STATUS_CHANGED",
        entityId: "another-order",
      });
      socketHandlers.get("notification:created")?.({
        type: "ORDER_STATUS_CHANGED",
        entityId: ORDER_ID,
      });
    });

    await waitFor(() => expect(trackingRequestCount).toBe(2));
  });

  it("lets the buyer say a delivered parcel never came", async () => {
    let reportBody: unknown;
    mswServer.use(
      http.get(TRACKING_URL, () =>
        okJson({
          ...tracking,
          stage: { ...tracking.stage, stage: "DELIVERED" },
          parcels: [deliveredParcel],
        }),
      ),
      http.post(DISPUTE_URL, async ({ request }) => {
        reportBody = await request.json();
        return okJson(
          { ...deliveredParcel, canReportNotReceived: false, isReportedNotReceived: true },
          201,
        );
      }),
    );
    const user = userEvent.setup();
    renderTimeline({ ...tracking.stage, stage: "DELIVERED" });

    await user.click(await screen.findByRole("button", { name: "I didn't receive this" }));
    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();
    await user.type(screen.getByLabelText("What happened?"), "Nothing reached my door today.");
    await user.click(sendButton);

    await waitFor(() =>
      expect(reportBody).toEqual({
        shipmentId: "shipment-1",
        details: "Nothing reached my door today.",
      }),
    );
  });

  it("says so when the updates can't be loaded, and keeps the stage", async () => {
    mswServer.use(
      http.get(TRACKING_URL, () => HttpResponse.json({ success: false }, { status: 500 })),
    );
    renderTimeline();

    expect(await screen.findByText(/couldn't load the latest updates/)).toBeInTheDocument();
    expect(screen.getByText("Out for delivery")).toBeInTheDocument();
  });

  it("shows an empty state before anything has happened", async () => {
    mswServer.use(http.get(TRACKING_URL, () => okJson({ ...tracking, parcels: [], events: [] })));
    renderTimeline({ stage: "ORDER_PLACED", collectedBrandCount: 0, totalBrandCount: 1 });

    expect(
      await screen.findByText("Updates will show here as your order moves."),
    ).toBeInTheDocument();
  });
});
