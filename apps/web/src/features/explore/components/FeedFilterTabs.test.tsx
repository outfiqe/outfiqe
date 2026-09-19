import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_LOCKED_TAB_TOOLTIP, EXPLORE_TAB, FEED_LAYOUT } from "../explore.constants";
import { useTrendingTags } from "../hooks/useTrendingTags";
import { FeedFilterTabs } from "./FeedFilterTabs";

vi.mock("../hooks/useTrendingTags", () => ({
  useTrendingTags: vi.fn(),
}));

const mockTrendingTags = (overrides: Partial<ReturnType<typeof useTrendingTags>>) => {
  vi.mocked(useTrendingTags).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useTrendingTags>);
};

const renderTabs = (props?: Partial<Parameters<typeof FeedFilterTabs>[0]>) =>
  render(
    <FeedFilterTabs
      tab={EXPLORE_TAB.FOR_YOU}
      onChange={vi.fn()}
      layout={FEED_LAYOUT.GRID}
      onLayoutChange={vi.fn()}
      {...props}
    />,
  );

beforeEach(() => {
  mockTrendingTags({ isLoading: true });
});

describe("FeedFilterTabs", () => {
  it("shows the fixed tabs immediately and skeleton chips while trending tags load", () => {
    mockTrendingTags({ isLoading: true });

    const { container } = renderTabs();

    expect(screen.getByRole("button", { name: "For you" })).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("renders a chip per trending tag once loaded", () => {
    mockTrendingTags({
      data: [
        { tag: "denim", postCount: 3 },
        { tag: "linen", postCount: 1 },
      ],
    });

    const { container } = renderTabs();

    expect(screen.getByRole("button", { name: "#denim" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#linen" })).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
  });

  it("reports fixed-tab, tag and layout changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onLayoutChange = vi.fn();
    mockTrendingTags({ data: [{ tag: "denim", postCount: 3 }] });

    renderTabs({ onChange, onLayoutChange });

    await user.click(screen.getByRole("button", { name: "Trending" }));
    await user.click(screen.getByRole("button", { name: "#denim" }));
    await user.click(screen.getByRole("button", { name: "List view" }));

    expect(onChange).toHaveBeenNthCalledWith(1, EXPLORE_TAB.TRENDING);
    expect(onChange).toHaveBeenNthCalledWith(2, "denim");
    expect(onLayoutChange).toHaveBeenCalledWith(FEED_LAYOUT.LIST);
  });

  it("keeps locked tabs visible but inert and explains why on hover", async () => {
    mockTrendingTags({ data: [] });
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderTabs({
      onChange,
      tab: EXPLORE_TAB.TRENDING,
      lockedTabs: [EXPLORE_TAB.FOR_YOU, EXPLORE_TAB.FOLLOWING],
      lockedTabTooltip: ADMIN_LOCKED_TAB_TOOLTIP,
    });

    const forYouTab = screen.getByRole("button", { name: "For you" });
    expect(forYouTab).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Following" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Trending" })).not.toHaveAttribute("aria-disabled");

    await user.click(forYouTab);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.focus(forYouTab);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(ADMIN_LOCKED_TAB_TOOLTIP);
  });

  it("keeps locked tabs inert without a tooltip while no explanation is given", async () => {
    mockTrendingTags({ data: [] });
    const onChange = vi.fn();

    renderTabs({ onChange, lockedTabs: [EXPLORE_TAB.FOR_YOU] });

    const forYouTab = screen.getByRole("button", { name: "For you" });
    await userEvent.click(forYouTab);
    fireEvent.focus(forYouTab);

    expect(onChange).not.toHaveBeenCalled();
    expect(forYouTab).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("marks the active fixed tab and layout as pressed", () => {
    mockTrendingTags({ data: [] });

    renderTabs({ tab: EXPLORE_TAB.TRENDING, layout: FEED_LAYOUT.LIST });

    expect(screen.getByRole("button", { name: "Trending" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
