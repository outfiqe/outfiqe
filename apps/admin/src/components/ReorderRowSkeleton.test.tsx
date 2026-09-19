import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReorderRowSkeleton } from "./ReorderRowSkeleton";

describe("ReorderRowSkeleton", () => {
  it("draws the drag handle, the two stacked move buttons and the action button", () => {
    const { container } = render(<ReorderRowSkeleton />);

    expect(container.querySelector(".size-4")).not.toBeNull();
    expect(container.querySelectorAll(".size-7")).toHaveLength(2);
    expect(container.querySelector("button.h-11")).not.toBeNull();
  });

  it("adds a thumbnail only for rows that show an image", () => {
    const { container: withoutImage } = render(<ReorderRowSkeleton />);
    const { container: withImage } = render(<ReorderRowSkeleton hasImage />);

    expect(withoutImage.querySelector(".size-14")).toBeNull();
    expect(withImage.querySelector(".size-14")).not.toBeNull();
  });
});
