import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PagePendingSkeleton } from "./PagePendingSkeleton";

describe("PagePendingSkeleton", () => {
  it("announces a loading status to assistive technology", () => {
    render(<PagePendingSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading page");
  });

  it("shimmers its placeholder blocks instead of pulsing them", () => {
    render(<PagePendingSkeleton />);

    const placeholderBlocks = screen.getByRole("status").querySelectorAll(".skeleton-shimmer");

    expect(placeholderBlocks.length).toBeGreaterThan(0);
    placeholderBlocks.forEach((placeholderBlock) => {
      expect(placeholderBlock).not.toHaveClass("animate-pulse");
    });
  });
});
