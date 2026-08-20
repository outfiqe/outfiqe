import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreatorPostGridSkeleton } from "@/features/creator-profile/components/CreatorPostGridSkeleton";

const GRID_ITEM_COUNT = 9;

describe("CreatorPostGridSkeleton", () => {
  it("renders an accessible loading status with the expected number of placeholders", () => {
    render(<CreatorPostGridSkeleton />);

    const status = screen.getByRole("status", { name: "Loading posts" });
    expect(status.children).toHaveLength(GRID_ITEM_COUNT);
  });
});
