import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  NEW_TO_PICKUP_MESSAGE,
  RELIABILITY_LEVEL_MESSAGES,
  WHAT_COUNTS_MESSAGE,
} from "../constants/reliabilityLabels";
import { DeliveryReliabilityPanel } from "./DeliveryReliabilityPanel";

const RELIABILITY_URL = "/api/logistics/brand/reliability";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const reliability = {
  windowDays: 30,
  incidentCount: 5,
  pickupCount: 30,
  incidentRatePercent: 17,
  isNewToPickup: false,
  level: "WARNING",
  incidents: [
    {
      id: "incident-1",
      kind: "WASTED_VISIT",
      orderId: null,
      note: "Shop was closed",
      occurredAt: "2026-10-16T08:00:00.000Z",
    },
  ],
  nextCursor: null,
};

const renderPanel = (respond: () => Response) => {
  let requestCount = 0;
  mswServer.use(
    http.get(RELIABILITY_URL, () => {
      requestCount += 1;
      return respond();
    }),
  );
  const { container } = render(<DeliveryReliabilityPanel />, {
    wrapper: createQueryClientWrapper(),
  });
  return { container, readRequestCount: () => requestCount };
};

describe("DeliveryReliabilityPanel", () => {
  it("lists the brand's recent problems with a gentle nudge and what counts", async () => {
    renderPanel(() => okJson(reliability));

    expect(await screen.findByText("5 in the last 30 days")).toBeInTheDocument();
    expect(screen.getByText(RELIABILITY_LEVEL_MESSAGES.WARNING)).toBeInTheDocument();
    expect(screen.getByText(WHAT_COUNTS_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText("Rider visit with nothing ready")).toBeInTheDocument();
    expect(screen.getByText(/Shop was closed/)).toBeInTheDocument();
  });

  it("tells a brand new to Outfiqe pickup that its problems don't count yet", async () => {
    renderPanel(() => okJson({ ...reliability, isNewToPickup: true, level: "GOOD" }));

    expect(await screen.findByText(NEW_TO_PICKUP_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(RELIABILITY_LEVEL_MESSAGES.GOOD)).not.toBeInTheDocument();
  });

  it("shows nothing at all when the brand has had no problems", async () => {
    const { container, readRequestCount } = renderPanel(() =>
      okJson({ ...reliability, incidentCount: 0, level: "GOOD", incidents: [] }),
    );

    await waitFor(() => expect(readRequestCount()).toBe(1));
    expect(container.querySelector("section")).toBeNull();
    expect(screen.queryByText(/in the last 30 days/)).not.toBeInTheDocument();
  });

  it("stays out of the way while loading and when it can't load", async () => {
    const { container, readRequestCount } = renderPanel(() =>
      HttpResponse.json({}, { status: 500 }),
    );

    expect(container.querySelector("section")).toBeNull();
    await waitFor(() => expect(readRequestCount()).toBeGreaterThan(0));
    expect(container.querySelector("section")).toBeNull();
  });
});
