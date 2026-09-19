import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionRowSkeleton } from "./ActionRowSkeleton";

describe("ActionRowSkeleton", () => {
  it("keeps the real row wrapper and an action button", () => {
    const { container } = render(<ActionRowSkeleton />);

    expect(container.firstElementChild).toHaveClass("rounded-xl", "border", "bg-card", "p-4");
    expect(container.querySelectorAll(".h-8.w-16")).toHaveLength(1);
  });

  it("draws as many action buttons as the real row has", () => {
    const { container } = render(<ActionRowSkeleton actionCount={2} />);

    expect(container.querySelectorAll(".h-8.w-16")).toHaveLength(2);
  });

  it("adds the sub line only when the real row has one", () => {
    const { container: plain } = render(<ActionRowSkeleton />);
    const { container: withSubLine } = render(<ActionRowSkeleton hasSubLine />);

    expect(withSubLine.querySelectorAll(".h-4").length).toBe(
      plain.querySelectorAll(".h-4").length + 1,
    );
  });
});
