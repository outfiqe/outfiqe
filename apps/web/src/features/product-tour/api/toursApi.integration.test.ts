import { TourOutcome } from "@outfiqe/types";
import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { toursApi } from "./toursApi";

const SAVED_TOUR = {
  tourKey: "brand-dashboard",
  version: 1,
  outcome: TourOutcome.COMPLETED,
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const envelope = <T>(data: T) => ({ success: true, message: "ok", data });

describe("toursApi.listMine", () => {
  it("returns the parsed list of saved tours", async () => {
    mswServer.use(
      http.get("/api/tours/me", () => HttpResponse.json(envelope({ tours: [SAVED_TOUR] }))),
    );

    await expect(toursApi.listMine()).resolves.toEqual({ tours: [SAVED_TOUR] });
  });

  it("keeps a tour key this build does not know about instead of failing", async () => {
    const futureTour = { ...SAVED_TOUR, tourKey: "creator-dashboard" };
    mswServer.use(
      http.get("/api/tours/me", () => HttpResponse.json(envelope({ tours: [futureTour] }))),
    );

    await expect(toursApi.listMine()).resolves.toEqual({ tours: [futureTour] });
  });

  it("rejects an outcome it cannot understand", async () => {
    const strangeTour = { ...SAVED_TOUR, outcome: "PAUSED" };
    mswServer.use(
      http.get("/api/tours/me", () => HttpResponse.json(envelope({ tours: [strangeTour] }))),
    );

    await expect(toursApi.listMine()).rejects.toThrow();
  });
});

describe("toursApi.recordOutcome", () => {
  it("puts the version and outcome to the tour's own URL and returns the saved row", async () => {
    const receivedBodies: unknown[] = [];
    mswServer.use(
      http.put("/api/tours/me/brand-dashboard", async ({ request }) => {
        receivedBodies.push(await request.json());
        return HttpResponse.json(envelope(SAVED_TOUR));
      }),
    );

    const savedTour = await toursApi.recordOutcome({
      tourKey: "brand-dashboard",
      version: 1,
      outcome: TourOutcome.COMPLETED,
    });

    expect(receivedBodies).toEqual([{ version: 1, outcome: TourOutcome.COMPLETED }]);
    expect(savedTour).toEqual(SAVED_TOUR);
  });
});
