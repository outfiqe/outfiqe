import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const linkStatus = { pending: false };

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useLinkStatus: () => linkStatus,
}));

import { EXPLORE_TAB, FEED_LAYOUT } from "../explore.constants";
import { ExploreSidebarNav } from "./ExploreSidebarNav";

const renderNav = (props?: Partial<Parameters<typeof ExploreSidebarNav>[0]>) =>
  render(
    <ExploreSidebarNav
      tab={EXPLORE_TAB.FOR_YOU}
      onChange={vi.fn()}
      layout={FEED_LAYOUT.GRID}
      onLayoutChange={vi.fn()}
      {...props}
    />,
  );

afterEach(() => {
  linkStatus.pending = false;
  vi.clearAllMocks();
});

describe("ExploreSidebarNav", () => {
  it("marks the active tab and layout as pressed", () => {
    renderNav({ tab: EXPLORE_TAB.TRENDING, layout: FEED_LAYOUT.LIST });

    expect(screen.getByRole("button", { name: "Trending" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "For you" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports tab and layout changes to the parent", async () => {
    const onChange = vi.fn();
    const onLayoutChange = vi.fn();
    renderNav({ onChange, onLayoutChange });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Following" }));
    await user.click(screen.getByRole("button", { name: "List" }));

    expect(onChange).toHaveBeenCalledWith(EXPLORE_TAB.FOLLOWING);
    expect(onLayoutChange).toHaveBeenCalledWith(FEED_LAYOUT.LIST);
  });

  it("links Saved to the posts tab of the wishlist", () => {
    renderNav();

    expect(screen.getByRole("link", { name: /Saved/ })).toHaveAttribute(
      "href",
      "/wishlist?tab=posts",
    );
  });

  it("highlights Saved and shows its pending dot while its navigation is pending", () => {
    linkStatus.pending = true;
    renderNav();

    const savedContent = screen.getByText("Saved");
    expect(savedContent.className).toContain("bg-foreground");
    expect(savedContent.querySelector("span[aria-hidden]")?.className).toContain(
      "motion-safe:animate-pulse",
    );
  });

  it("leaves Saved unhighlighted with a hidden dot when no navigation is pending", () => {
    renderNav();

    const savedContent = screen.getByText("Saved");
    expect(savedContent.className).toContain("text-muted-foreground");
    expect(savedContent.className).not.toContain("bg-foreground");
    expect(savedContent.querySelector("span[aria-hidden]")?.className).toContain("opacity-0");
  });
});
