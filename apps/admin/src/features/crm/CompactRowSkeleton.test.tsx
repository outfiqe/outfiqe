import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompactRowSkeleton } from "./CompactRowSkeleton";

describe("CompactRowSkeleton", () => {
  it("draws rows with the same compact border and padding as the real list items", () => {
    const { container } = render(<CompactRowSkeleton />);

    const rows = container.querySelectorAll("li");
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row).toHaveClass("rounded-lg", "border", "border-border", "p-3");
    });
  });

  it("adds a checkbox and a trailing badge only when the real row has them", () => {
    const { container: plain } = render(<CompactRowSkeleton />);
    const { container: full } = render(<CompactRowSkeleton hasCheckbox hasTrailingBadge />);

    expect(plain.querySelector(".size-4")).toBeNull();
    expect(plain.querySelector(".rounded-full")).toBeNull();
    expect(full.querySelector(".size-4")).not.toBeNull();
    expect(full.querySelector(".rounded-full")).not.toBeNull();
  });
});
