import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { emptyPage, LOGISTICS_API_BASE, okJson } from "../../testing/logisticsFixtures";
import { RiderPayPage } from "./RiderPayPage";

const RATES_URL = `${LOGISTICS_API_BASE}/rider-pay-rates`;
const EARNINGS_URL = `${LOGISTICS_API_BASE}/rider-earnings`;

const defaultRates = {
  countryCode: "NP",
  currency: "NPR",
  rateInEffect: { visitAmount: 70, extraStopAmount: 15, wastedVisitAmount: 35, isDefault: true },
  rates: [],
};

const pendingEarning = {
  id: "earning-1",
  riderId: "rider-1",
  riderName: "Sita Rider",
  riderTaskId: "task-1",
  brandName: "Kathmandu Knits",
  pickupLocationLabel: "Thamel shop",
  kind: "VISIT",
  currency: "NPR",
  stopCount: 2,
  amount: 85,
  status: "PENDING",
  earnedAt: "2026-10-17T05:15:00.000Z",
  releasesAt: "2026-10-24T05:15:00.000Z",
  voidReason: null,
};

describe("RiderPayPage", () => {
  it("shows the launch default and saves a new rate", async () => {
    let rateBody: unknown;
    mswServer.use(
      http.get(RATES_URL, () => okJson(defaultRates)),
      http.get(EARNINGS_URL, () => okJson(emptyPage)),
      http.post(RATES_URL, async ({ request }) => {
        rateBody = await request.json();
        return okJson(
          {
            id: "rate-1",
            countryCode: "NP",
            currency: "NPR",
            visitAmount: 80,
            extraStopAmount: 15,
            wastedVisitAmount: 35,
            effectiveFrom: "2026-10-18T00:00:00.000Z",
            isActive: true,
            createdAt: "2026-10-18T00:00:00.000Z",
            createdByName: "Ops",
          },
          201,
        );
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<RiderPayPage />, { path: "/logistics/rider-pay" });

    expect(
      await screen.findByText("This is the launch default. Set a rate to change it."),
    ).toBeInTheDocument();
    expect(screen.getByText("No earnings here yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change pay" }));
    const dialog = await screen.findByRole("dialog");
    const visitField = within(dialog).getByLabelText("Per visit (Rs.)");
    expect(visitField).toHaveValue(70);
    await user.clear(visitField);
    await user.type(visitField, "80");
    await user.click(within(dialog).getByRole("button", { name: "Save rate" }));

    await waitFor(() =>
      expect(rateBody).toEqual({
        countryCode: "NP",
        visitAmount: 80,
        extraStopAmount: 15,
        wastedVisitAmount: 35,
      }),
    );
  });

  it("voids an earning with a reason", async () => {
    let voidBody: unknown;
    mswServer.use(
      http.get(RATES_URL, () => okJson(defaultRates)),
      http.get(EARNINGS_URL, () => okJson({ items: [pendingEarning], nextCursor: null })),
      http.post(`${EARNINGS_URL}/earning-1/void`, async ({ request }) => {
        voidBody = await request.json();
        return okJson({ ...pendingEarning, status: "VOIDED", voidReason: "Fake visit" });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<RiderPayPage />, { path: "/logistics/rider-pay" });

    expect(await screen.findByText("Sita Rider")).toBeInTheDocument();
    expect(screen.getByText("2 bags")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Void" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Reason"), "Fake visit");
    await user.click(within(dialog).getByRole("button", { name: "Void earning" }));

    await waitFor(() => expect(voidBody).toEqual({ reason: "Fake visit" }));
  });
});
