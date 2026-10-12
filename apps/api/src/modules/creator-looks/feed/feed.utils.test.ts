import { describe, expect, it } from "vitest";

import { interleaveFollowedLooks } from "./feed.utils.js";

describe("interleaveFollowedLooks", () => {
  it("inserts a followed look every slotInterval positions", () => {
    const discoveryIds = ["d1", "d2", "d3", "d4", "d5", "d6"];
    const followedIds = ["f1", "f2"];

    expect(interleaveFollowedLooks(discoveryIds, followedIds, 3)).toEqual([
      "d1",
      "d2",
      "d3",
      "f1",
      "d4",
      "d5",
      "d6",
      "f2",
    ]);
  });

  it("appends any leftover followed looks once the discovery list runs out", () => {
    const discoveryIds = ["d1", "d2"];
    const followedIds = ["f1", "f2", "f3"];

    expect(interleaveFollowedLooks(discoveryIds, followedIds, 3)).toEqual([
      "d1",
      "d2",
      "f1",
      "f2",
      "f3",
    ]);
  });

  it("never duplicates a followed look that's already in the discovery list", () => {
    const discoveryIds = ["d1", "d2", "d3"];
    const followedIds = ["d2", "f1"];

    expect(interleaveFollowedLooks(discoveryIds, followedIds, 3)).toEqual(["d1", "d2", "d3", "f1"]);
  });

  it("returns the discovery list untouched when there are no followed looks", () => {
    const discoveryIds = ["d1", "d2"];

    expect(interleaveFollowedLooks(discoveryIds, [], 3)).toEqual(discoveryIds);
  });

  it("returns the discovery list untouched when every followed look is already discovered", () => {
    const discoveryIds = ["d1", "d2"];

    expect(interleaveFollowedLooks(discoveryIds, ["d1", "d2"], 3)).toEqual(discoveryIds);
  });

  it("handles an empty discovery list by returning just the followed looks", () => {
    expect(interleaveFollowedLooks([], ["f1", "f2"], 3)).toEqual(["f1", "f2"]);
  });
});
