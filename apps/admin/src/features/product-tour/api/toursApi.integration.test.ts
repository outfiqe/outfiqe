import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { toursApi } from "./toursApi";

const API_BASE = "http://localhost:3000/api";
const ok = (data: unknown) => HttpResponse.json({ success: true, data });

const SAVED_TOUR = {
  tourKey: "crm-dashboard",
  version: 1,
  outcome: TOUR_OUTCOME.COMPLETED,
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("toursApi.listMine", () => {
  it("returns the parsed list of saved tours", async () => {
    mswServer.use(http.get(`${API_BASE}/tours/me`, () => ok({ tours: [SAVED_TOUR] })));

    await expect(toursApi.listMine()).resolves.toEqual({ tours: [SAVED_TOUR] });
  });

  it("keeps a tour key this build does not know about instead of failing", async () => {
    const futureTour = { ...SAVED_TOUR, tourKey: "brand-dashboard" };
    mswServer.use(http.get(`${API_BASE}/tours/me`, () => ok({ tours: [futureTour] })));

    await expect(toursApi.listMine()).resolves.toEqual({ tours: [futureTour] });
  });

  it("rejects an outcome it cannot understand", async () => {
    const strangeTour = { ...SAVED_TOUR, outcome: "PAUSED" };
    mswServer.use(http.get(`${API_BASE}/tours/me`, () => ok({ tours: [strangeTour] })));

    await expect(toursApi.listMine()).rejects.toThrow();
  });
});

describe("toursApi.recordOutcome", () => {
  it("puts the version and outcome to the tour's own URL and returns the saved row", async () => {
    const receivedBodies: unknown[] = [];
    mswServer.use(
      http.put(`${API_BASE}/tours/me/crm-dashboard`, async ({ request }) => {
        receivedBodies.push(await request.json());
        return ok(SAVED_TOUR);
      }),
    );

    const savedTour = await toursApi.recordOutcome({
      tourKey: "crm-dashboard",
      version: 1,
      outcome: TOUR_OUTCOME.COMPLETED,
    });

    expect(receivedBodies).toEqual([{ version: 1, outcome: TOUR_OUTCOME.COMPLETED }]);
    expect(savedTour).toEqual(SAVED_TOUR);
  });
});
