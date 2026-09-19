import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardRowSkeleton } from "./CardRowSkeleton";

describe("CardRowSkeleton", () => {
  it("uses the same card wrapper as the real rows", () => {
    const { container } = render(<CardRowSkeleton />);

    expect(container.firstElementChild).toHaveClass(
      "rounded-xl",
      "border",
      "border-border",
      "bg-card",
      "p-4",
    );
  });

  it("renders the requested number of text lines, meta line and action buttons", () => {
    const { container } = render(
      <CardRowSkeleton textLineCount={2} hasMetaLine actionCount={3} actionSize="regular" />,
    );

    expect(container.querySelectorAll(".mt-1.h-5")).toHaveLength(2);
    expect(container.querySelectorAll(".mt-1.h-4")).toHaveLength(1);
    expect(container.querySelectorAll(".h-10.w-24")).toHaveLength(3);
  });

  it("leaves out the badge and the actions when they are not asked for", () => {
    const { container } = render(<CardRowSkeleton hasBadge={false} />);

    expect(container.querySelector(".rounded-full")).toBeNull();
    expect(container.querySelector(".h-8.w-20")).toBeNull();
  });

  it("adds a leading image block for rows that show a picture", () => {
    const { container } = render(<CardRowSkeleton leadingImageClass="size-16" />);

    expect(container.querySelector(".size-16")).not.toBeNull();
  });
});
