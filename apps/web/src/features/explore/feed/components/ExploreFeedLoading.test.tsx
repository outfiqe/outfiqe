import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FEED_LAYOUT } from "../../constants/explore.constants";
import { ExploreFeedLoading } from "./ExploreFeedLoading";

describe("ExploreFeedLoading", () => {
  it("shows the list skeleton when the page opens in list view", () => {
    render(<ExploreFeedLoading layout={FEED_LAYOUT.LIST} />);

    expect(screen.getByRole("status", { name: "Loading feed" }).className).toContain("flex-col");
  });

  it("shows the same compact grid the feed uses in grid view", () => {
    render(<ExploreFeedLoading layout={FEED_LAYOUT.GRID} />);

    expect(screen.getByRole("status", { name: "Loading feed" }).className).toContain("grid-cols-2");
  });
});
