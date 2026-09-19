import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BadgeCardSkeleton, CategoryToggleRowSkeleton, TitleActionCardSkeleton } from "./skeletons";

describe("gamification skeletons", () => {
  it("draws the badge card with an icon, two text lines and two action buttons", () => {
    const { container } = render(<BadgeCardSkeleton />);

    expect(container.querySelector(".size-10")).not.toBeNull();
    expect(container.querySelectorAll("button.flex-1")).toHaveLength(2);
  });

  it("draws the title card with a title, an edit button and a detail line", () => {
    const { container } = render(<TitleActionCardSkeleton />);

    expect(container.querySelector("button.h-9")).not.toBeNull();
    expect(container.querySelector(".mt-1.h-4")).not.toBeNull();
  });

  it("draws the leaderboard toggle row with a label and a checkbox", () => {
    const { container } = render(<CategoryToggleRowSkeleton />);

    expect(container.querySelector(".size-4")).not.toBeNull();
  });
});
