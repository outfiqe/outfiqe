import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { OutfitPublished } from "../api/outfitSchemas";
import { RAM, SITA } from "../testing/outfitFixtures";
import { PublishedBuildView } from "./PublishedBuildView";

const publishedBuild = (overrides: Partial<OutfitPublished> = {}): OutfitPublished => ({
  id: "outfit-1",
  title: "Dashain look",
  visibility: "SHARED",
  publishedVersion: 3,
  myRole: "VIEWER",
  items: [
    {
      slotKey: "top",
      slotLabel: "Top",
      position: 0,
      productId: "product-kurta",
      productName: "Maroon Kurta",
      imageUrl: null,
      brandName: "Kathmandu Threads",
      unitPrice: 3_200,
    },
  ],
  total: 3_200,
  contributors: [SITA, RAM],
  lockedAt: "2026-10-01T09:00:00.000Z",
  ...overrides,
});

const renderPublishedBuild = (build: OutfitPublished) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(<PublishedBuildView build={build} />, { wrapper: Wrapper });
};

describe("PublishedBuildView", () => {
  it("names everyone credited on the locked version", () => {
    renderPublishedBuild(publishedBuild());

    expect(screen.getByRole("heading", { name: "Built by" })).toBeInTheDocument();
    expect(screen.getByText("Sita Rai")).toBeInTheDocument();
    expect(screen.getByText("Ram Thapa")).toBeInTheDocument();
  });

  it("leaves out the credit section when nobody is credited any more", () => {
    renderPublishedBuild(publishedBuild({ contributors: [] }));

    expect(screen.getByRole("heading", { name: "Dashain look" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Built by" })).not.toBeInTheDocument();
    expect(screen.getByText("Maroon Kurta")).toBeInTheDocument();
  });
});
