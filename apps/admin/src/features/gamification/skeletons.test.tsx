import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ActionRowSkeleton,
  BadgeCardSkeleton,
  CategoryToggleRowSkeleton,
  TitleActionCardSkeleton,
} from "./skeletons";

describe("gamification skeletons", () => {
  it("keeps the real row wrapper and action button on the action row", () => {
    const { container } = render(<ActionRowSkeleton />);

    expect(container.firstElementChild).toHaveClass("rounded-xl", "border", "bg-card", "p-4");
    expect(container.querySelector(".h-8.w-16")).not.toBeNull();
  });

  it("adds the sub line only when the real row has one", () => {
    const { container: plain } = render(<ActionRowSkeleton />);
    const { container: withSubLine } = render(<ActionRowSkeleton hasSubLine />);

    expect(withSubLine.querySelectorAll(".h-4").length).toBe(
      plain.querySelectorAll(".h-4").length + 1,
    );
  });

  it("draws the badge card with an icon, two text lines and two action buttons", () => {
    const { container } = render(<BadgeCardSkeleton />);

    expect(container.querySelector(".size-10")).not.toBeNull();
    expect(container.querySelectorAll(".flex-1.rounded-lg")).toHaveLength(2);
  });

  it("draws the title card with a title, an edit button and a detail line", () => {
    const { container } = render(<TitleActionCardSkeleton />);

    expect(container.querySelector(".h-8.w-16")).not.toBeNull();
    expect(container.querySelector(".mt-1.h-4")).not.toBeNull();
  });

  it("draws the leaderboard toggle row with a label and a checkbox", () => {
    const { container } = render(<CategoryToggleRowSkeleton />);

    expect(container.querySelector(".size-6")).not.toBeNull();
  });
});
