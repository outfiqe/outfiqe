import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { LOGISTICS_API_BASE, okJson } from "../../testing/logisticsFixtures";
import { BrandReliabilityPage } from "./BrandReliabilityPage";

const RELIABILITY_URL = `${LOGISTICS_API_BASE}/brand-reliability`;

describe("BrandReliabilityPage", () => {
  it("lists brands to watch with how many problems they had", async () => {
    mswServer.use(
      http.get(RELIABILITY_URL, () =>
        okJson({
          brands: [
            { brandId: "brand-1", brandName: "Thread Co", incidentCount: 6, level: "REVIEW" },
            { brandId: "brand-2", brandName: "Knit Hut", incidentCount: 3, level: "WARNING" },
          ],
        }),
      ),
    );
    renderWithRouter(<BrandReliabilityPage />, { path: "/logistics/reliability" });

    expect(await screen.findByText("Thread Co")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("3 problems in 30 days")).toBeInTheDocument();
  });

  it("says so when no brand needs watching", async () => {
    mswServer.use(http.get(RELIABILITY_URL, () => okJson({ brands: [] })));
    renderWithRouter(<BrandReliabilityPage />, { path: "/logistics/reliability" });

    expect(
      await screen.findByText("No brand has had 3 or more problems in the last 30 days."),
    ).toBeInTheDocument();
  });
});
