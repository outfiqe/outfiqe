import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { creatorProfileApi } from "@/features/creator-profile/api/creatorProfileApi";

describe("creatorProfileApi.get", () => {
  it("fetches and parses a creator's public profile by handle", async () => {
    mswServer.use(
      http.get("/api/creators/by-handle/ava-martinez", () =>
        HttpResponse.json({
          success: true,
          message: "Creator.",
          data: {
            userId: "creator-9",
            name: "Ava Martinez",
            handle: "ava-martinez",
            avatarUrl: null,
            heightCm: 170,
            showHeight: true,
            hideFromLeaderboards: false,
            creatorStatus: "APPROVED",
            postsCount: 4,
            followerCount: 12,
            followingCount: 3,
            taggedPiecesCount: 2,
            isFollowing: false,
            featuredBadges: [],
            titleBadge: null,
          },
        }),
      ),
    );

    const profile = await creatorProfileApi.get("ava-martinez");

    expect(profile).toMatchObject({ userId: "creator-9", name: "Ava Martinez", postsCount: 4 });
  });
});
