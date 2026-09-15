import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FEED_LAYOUT } from "../explore.constants";
import { ExploreFeedSkeleton } from "./PostCardSkeleton";

describe("ExploreFeedSkeleton", () => {
  it("renders an actions-row placeholder on each list card, matching PostActionsRow's height", () => {
    render(<ExploreFeedSkeleton layout={FEED_LAYOUT.LIST} />);

    const feed = screen.getByRole("status", { name: "Loading feed" });
    const actionsRows = feed.querySelectorAll(".border-t.border-border");

    expect(actionsRows).toHaveLength(4);
    actionsRows.forEach((row) => {
      expect(row.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(4);
    });
  });
});
