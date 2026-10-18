import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { DeliveryReliabilityPanel } from "./DeliveryReliabilityPanel";

const RELIABILITY_URL = "/api/logistics/brand/reliability";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const reliability = {
  windowDays: 30,
  incidentCount: 3,
  level: "WARNING",
  warningAt: 3,
  reviewAt: 6,
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

describe("DeliveryReliabilityPanel", () => {
  it("shows the brand its recent problems and the warning", async () => {
    mswServer.use(http.get(RELIABILITY_URL, () => okJson(reliability)));
    render(<DeliveryReliabilityPanel isOrderLogisticsOn />, {
      wrapper: createQueryClientWrapper(),
    });

    expect(await screen.findByText("3 in the last 30 days")).toBeInTheDocument();
    expect(screen.getByText(/A few problems recently/)).toBeInTheDocument();
    expect(screen.getByText("Rider visit with nothing ready")).toBeInTheDocument();
    expect(screen.getByText(/Shop was closed/)).toBeInTheDocument();
  });

  it("says when there have been no problems", async () => {
    mswServer.use(
      http.get(RELIABILITY_URL, () =>
        okJson({ ...reliability, incidentCount: 0, level: "GOOD", incidents: [] }),
      ),
    );
    render(<DeliveryReliabilityPanel isOrderLogisticsOn />, {
      wrapper: createQueryClientWrapper(),
    });

    expect(await screen.findByText("No problems in the last 30 days.")).toBeInTheDocument();
  });

  it("stays hidden while Outfiqe delivery is off and there is nothing to show", async () => {
    let requestCount = 0;
    mswServer.use(
      http.get(RELIABILITY_URL, () => {
        requestCount += 1;
        return okJson({ ...reliability, incidentCount: 0, level: "GOOD", incidents: [] });
      }),
    );
    const { container } = render(<DeliveryReliabilityPanel isOrderLogisticsOn={false} />, {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(requestCount).toBe(1));
    expect(screen.queryByLabelText("Loading reliability")).not.toBeInTheDocument();
    expect(container.querySelector("section")).toBeNull();
  });

  it("still shows past problems after Outfiqe delivery is switched off", async () => {
    mswServer.use(http.get(RELIABILITY_URL, () => okJson(reliability)));
    render(<DeliveryReliabilityPanel isOrderLogisticsOn={false} />, {
      wrapper: createQueryClientWrapper(),
    });

    expect(await screen.findByText("3 in the last 30 days")).toBeInTheDocument();
  });

  it("stays out of the way when it can't load", async () => {
    mswServer.use(http.get(RELIABILITY_URL, () => HttpResponse.json({}, { status: 500 })));
    const { container } = render(<DeliveryReliabilityPanel isOrderLogisticsOn />, {
      wrapper: createQueryClientWrapper(),
    });

    await screen.findByLabelText("Loading reliability");
    await expect(screen.findByText(/Delivery reliability/)).rejects.toThrow();
    expect(container.querySelector("section")).toBeNull();
  });
});
