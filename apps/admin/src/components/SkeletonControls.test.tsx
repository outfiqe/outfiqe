import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkeletonBadge, SkeletonButton } from "./SkeletonControls";

describe("SkeletonControls", () => {
  it("draws the placeholder button with the real small button size", () => {
    const { container } = render(<SkeletonButton size="sm" label="Edit" />);

    expect(container.querySelector("button")).toHaveClass("h-9", "skeleton-pill");
  });

  it("draws the placeholder button with the real default button size", () => {
    const { container } = render(<SkeletonButton />);

    expect(container.querySelector("button")).toHaveClass("h-11");
  });

  it("keeps the placeholder button out of the tab order and out of the accessibility tree", () => {
    render(<SkeletonButton label="Delete" />);

    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByText("Delete", { selector: "button" })).toBeDisabled();
  });

  it("draws the placeholder badge with the real badge padding", () => {
    const { container } = render(<SkeletonBadge label="Active" />);

    expect(container.firstElementChild).toHaveClass("px-3", "py-1.5", "skeleton-pill");
  });
});
