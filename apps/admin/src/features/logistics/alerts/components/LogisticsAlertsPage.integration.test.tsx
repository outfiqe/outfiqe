import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { LOGISTICS_API_BASE, okJson } from "../../testing/logisticsFixtures";
import { LogisticsAlertsPage } from "./LogisticsAlertsPage";

const ALERTS_URL = `${LOGISTICS_API_BASE}/alerts`;

const unknownStatusAlert = {
  id: "alert-1",
  alertType: "UNKNOWN_PARTNER_STATUS",
  orderId: "order-1",
  fulfilmentGroupId: null,
  shipmentId: "shipment-1",
  trackingCode: "OFQ7K2M9QAB",
  brandName: null,
  hubName: "Kathmandu hub",
  detail: "PARKED AT DEPOT",
  raisedAt: "2026-10-18T05:00:00.000Z",
  resolvedAt: null,
  isAutoResolved: false,
  resolutionNote: null,
  resolvedByName: null,
};

describe("LogisticsAlertsPage", () => {
  it("lists open alerts with counts and resolves one with a note", async () => {
    let resolveBody: unknown;
    mswServer.use(
      http.get(ALERTS_URL, () =>
        okJson({
          items: [unknownStatusAlert],
          nextCursor: null,
          openCounts: [{ alertType: "UNKNOWN_PARTNER_STATUS", openCount: 1 }],
        }),
      ),
      http.post(`${ALERTS_URL}/alert-1/resolve`, async ({ request }) => {
        resolveBody = await request.json();
        return okJson({
          ...unknownStatusAlert,
          resolvedAt: "2026-10-18T06:00:00.000Z",
          resolutionNote: "Mapped it",
        });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<LogisticsAlertsPage />, { path: "/logistics/alerts" });

    expect(await screen.findByText("PARKED AT DEPOT")).toBeInTheDocument();
    expect(screen.getByText("OFQ7K2M9QAB")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "A partner status we don't know yet (1)" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resolve" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("What you did"), "Mapped it");
    await user.click(within(dialog).getByRole("button", { name: "Resolve" }));

    await waitFor(() => expect(resolveBody).toEqual({ note: "Mapped it" }));
  });

  it("says so when nothing needs attention", async () => {
    mswServer.use(
      http.get(ALERTS_URL, () => okJson({ items: [], nextCursor: null, openCounts: [] })),
    );
    renderWithRouter(<LogisticsAlertsPage />, { path: "/logistics/alerts" });

    expect(await screen.findByText("Nothing needs attention right now.")).toBeInTheDocument();
  });
});
