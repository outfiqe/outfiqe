import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BRAND_GRID_SKELETON_COUNT } from "@/features/brands/brands.constants";
import { BrandGridSkeleton } from "@/features/brands/components/BrandGridSkeleton";

describe("BrandGridSkeleton", () => {
  it("renders an accessible loading status with the expected number of placeholders", () => {
    render(<BrandGridSkeleton />);

    const status = screen.getByRole("status", { name: "Loading brands" });
    expect(status.children).toHaveLength(BRAND_GRID_SKELETON_COUNT);
  });
});
