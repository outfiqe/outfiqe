import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { LOGISTICS_API_BASE, okJson } from "../../testing/logisticsFixtures";
import { BrandReliabilityPage } from "./BrandReliabilityPage";

const RELIABILITY_URL = `${LOGISTICS_API_BASE}/brand-reliability`;

const brandToWatch = {
  brandId: "brand-1",
  brandName: "Thread Co",
  incidentCount: 12,
  pickupCount: 40,
  incidentRatePercent: 30,
  isNewToPickup: false,
  level: "REVIEW",
};

describe("BrandReliabilityPage", () => {
  it("lists brands to watch with their problems, pickups and share", async () => {
    mswServer.use(
      http.get(RELIABILITY_URL, () =>
        okJson({
          brands: [
            brandToWatch,
            {
              ...brandToWatch,
              brandId: "brand-2",
              brandName: "Knit Hut",
              incidentCount: 3,
              pickupCount: 60,
              incidentRatePercent: 5,
              level: "GOOD",
            },
            {
              ...brandToWatch,
              brandId: "brand-3",
              brandName: "New Loom",
              incidentCount: 4,
              pickupCount: 6,
              incidentRatePercent: 67,
              isNewToPickup: true,
              level: "GOOD",
            },
          ],
        }),
      ),
    );
    renderWithRouter(<BrandReliabilityPage />, { path: "/logistics/reliability" });

    expect(await screen.findByText("Thread Co")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("12 problems in 30 days · 40 pickups (30%)")).toBeInTheDocument();
    expect(screen.getAllByText("Watching")).toHaveLength(2);
    expect(screen.getByText("New to pickup")).toBeInTheDocument();
  });

  it("says so when no brand needs watching", async () => {
    mswServer.use(http.get(RELIABILITY_URL, () => okJson({ brands: [] })));
    renderWithRouter(<BrandReliabilityPage />, { path: "/logistics/reliability" });

    expect(
      await screen.findByText("No brand has had 3 or more problems in the last 30 days."),
    ).toBeInTheDocument();
  });
});
