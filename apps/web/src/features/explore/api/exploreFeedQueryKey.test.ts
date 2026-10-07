import { describe, expect, it } from "vitest";

import { buildExploreFeedQueryKey } from "./exploreFeedQueryKey";

describe("buildExploreFeedQueryKey", () => {
  it("scopes the feed cache to the signed-in viewer", () => {
    expect(buildExploreFeedQueryKey("for_you", "user-1")).toEqual([
      "explore-feed",
      "for_you",
      "user-1",
    ]);
  });

  it("gives a logged-out visitor the same key whether the viewer is null or omitted, so the server-rendered page is reused", () => {
    expect(buildExploreFeedQueryKey("trending", null)).toEqual([
      "explore-feed",
      "trending",
      "anonymous",
    ]);
    expect(buildExploreFeedQueryKey("trending")).toEqual(
      buildExploreFeedQueryKey("trending", null),
    );
  });
});
