import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CREATOR_LEADERBOARD_CATEGORY } from "../creatorLeaderboard.constants";
import { useCreatorLeaderboardCategories } from "../hooks/useCreatorLeaderboardCategories";
import { CreatorLeaderboardTabs } from "./CreatorLeaderboardTabs";

vi.mock("../hooks/useCreatorLeaderboardCategories", () => ({
  useCreatorLeaderboardCategories: vi.fn(),
}));

const mockCategoriesQuery = (
  overrides: Partial<ReturnType<typeof useCreatorLeaderboardCategories>>,
) => {
  vi.mocked(useCreatorLeaderboardCategories).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useCreatorLeaderboardCategories>);
};

beforeEach(() => {
  mockCategoriesQuery({ isLoading: true });
});

describe("CreatorLeaderboardTabs", () => {
  it("shows placeholder tabs while the categories are loading", () => {
    mockCategoriesQuery({ isLoading: true });

    render(
      <CreatorLeaderboardTabs category={CREATOR_LEADERBOARD_CATEGORY.TOP_XP} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("status", { name: "Loading rankings" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders only the enabled categories once loaded", () => {
    mockCategoriesQuery({
      data: [
        { category: CREATOR_LEADERBOARD_CATEGORY.TOP_XP, enabled: true },
        { category: CREATOR_LEADERBOARD_CATEGORY.MOST_LIKES, enabled: false },
      ],
    });

    render(
      <CreatorLeaderboardTabs category={CREATOR_LEADERBOARD_CATEGORY.TOP_XP} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Top XP" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Most Likes" })).not.toBeInTheDocument();
  });

  it("reports the picked category to onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockCategoriesQuery({
      data: [
        { category: CREATOR_LEADERBOARD_CATEGORY.TOP_XP, enabled: true },
        { category: CREATOR_LEADERBOARD_CATEGORY.TOP_SELLER, enabled: true },
      ],
    });

    render(
      <CreatorLeaderboardTabs category={CREATOR_LEADERBOARD_CATEGORY.TOP_XP} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Top Seller" }));

    expect(onChange).toHaveBeenCalledWith(CREATOR_LEADERBOARD_CATEGORY.TOP_SELLER);
  });
});
