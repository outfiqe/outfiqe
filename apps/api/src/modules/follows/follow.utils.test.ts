import { describe, expect, it } from "vitest";

import { CreatorStatus, FollowTargetType, UserRole } from "#generated/prisma/enums.js";
import type { BrandRecord } from "#modules/brands/brand.types.js";
import type { UserRecord } from "#modules/users/user.types.js";

import type { CandidateSignals, ScoredSuggestionCandidate } from "./follow.types.js";
import {
  ensureMomentumDiscoveryFloor,
  isPureMomentumSignal,
  isWithinNewCreatorFreshnessWindow,
  scoreSuggestionCandidate,
  suggestionRotationSeed,
  toBrandFollowTarget,
  toFollowerView,
  toFollowTarget,
  toPrismaTargetType,
} from "./follow.utils.js";

const NOW = new Date("2026-08-21T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const baseSignals = (overrides: Partial<CandidateSignals> = {}): CandidateSignals => ({
  mutualFollowCount: 0,
  engagedNotFollowed: false,
  hashtagMatchingPosts: 0,
  momentum: 0,
  followerCount: 0,
  creatorApprovedAt: null,
  ...overrides,
});

const candidateOf = (
  creatorId: string,
  score: number,
  signals: CandidateSignals,
): ScoredSuggestionCandidate => ({
  creatorId,
  score,
  signals,
});

const baseUser: UserRecord = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  handle: "ada",
  phone: null,
  avatarUrl: null,
  passwordHash: null,
  role: UserRole.CUSTOMER,
  isCreator: true,
  creatorStatus: CreatorStatus.APPROVED,
  creatorApprovedAt: null,
  heightCm: null,
  showHeight: false,
  emailVerified: true,
  followerCount: 12,
  followingCount: 3,
  hideFromLeaderboards: false,
  lastSeenAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const baseBrand: BrandRecord = {
  id: "brand-1",
  name: "Acme",
  contactName: "Contact",
  email: "brand@example.com",
  phone: "555-0100",
  instagram: "@acme",
  avatarUrl: null,
  bannerUrl: null,
  madeInNepal: true,
  applicationId: null,
  followerCount: 40,
  rating: 4.5,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("toPrismaTargetType", () => {
  it("maps the user param to the USER enum value", () => {
    expect(toPrismaTargetType("user")).toBe(FollowTargetType.USER);
  });

  it("maps the brand param to the BRAND enum value", () => {
    expect(toPrismaTargetType("brand")).toBe(FollowTargetType.BRAND);
  });
});

describe("toFollowTarget", () => {
  it("shapes a user record into a followable target", () => {
    expect(toFollowTarget(baseUser)).toEqual({
      kind: "user",
      id: "user-1",
      name: "Ada",
      handle: "ada",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      followerCount: 12,
    });
  });
});

describe("toFollowerView", () => {
  it("marks a follower as followed by the viewer", () => {
    expect(toFollowerView(baseUser, true)).toEqual({
      id: "user-1",
      name: "Ada",
      handle: "ada",
      isCreator: true,
      isFollowedByViewer: true,
    });
  });

  it("marks a follower as not followed by the viewer", () => {
    expect(toFollowerView(baseUser, false).isFollowedByViewer).toBe(false);
  });
});

describe("toBrandFollowTarget", () => {
  it("shapes a brand record into a followable target", () => {
    expect(toBrandFollowTarget(baseBrand)).toEqual({
      kind: "brand",
      id: "brand-1",
      name: "Acme",
      followerCount: 40,
    });
  });
});

describe("isWithinNewCreatorFreshnessWindow", () => {
  it("returns false when never approved", () => {
    expect(isWithinNewCreatorFreshnessWindow(null, NOW)).toBe(false);
  });

  it("returns true for an approval within the freshness window", () => {
    const approvedAt = new Date(NOW.getTime() - 5 * DAY_MS);
    expect(isWithinNewCreatorFreshnessWindow(approvedAt, NOW)).toBe(true);
  });

  it("returns true exactly at the freshness window boundary", () => {
    const approvedAt = new Date(NOW.getTime() - 14 * DAY_MS);
    expect(isWithinNewCreatorFreshnessWindow(approvedAt, NOW)).toBe(true);
  });

  it("returns false once past the freshness window", () => {
    const approvedAt = new Date(NOW.getTime() - 15 * DAY_MS);
    expect(isWithinNewCreatorFreshnessWindow(approvedAt, NOW)).toBe(false);
  });
});

describe("isPureMomentumSignal", () => {
  it("is true when no social/interest signal fired", () => {
    expect(isPureMomentumSignal(baseSignals({ momentum: 42 }))).toBe(true);
  });

  it("is false when there's a mutual-follow signal", () => {
    expect(isPureMomentumSignal(baseSignals({ mutualFollowCount: 1 }))).toBe(false);
  });

  it("is false when the viewer engaged without following", () => {
    expect(isPureMomentumSignal(baseSignals({ engagedNotFollowed: true }))).toBe(false);
  });

  it("is false when there's a hashtag match", () => {
    expect(isPureMomentumSignal(baseSignals({ hashtagMatchingPosts: 1 }))).toBe(false);
  });
});

describe("scoreSuggestionCandidate", () => {
  it("scores zero for a candidate with no signal at all", () => {
    expect(scoreSuggestionCandidate(baseSignals(), NOW)).toBe(0);
  });

  it("rewards momentum and follower count logarithmically before any boost", () => {
    const score = scoreSuggestionCandidate(baseSignals({ momentum: 10, followerCount: 100 }), NOW);
    expect(score).toBeCloseTo(Math.log1p(10) + 0.5 * Math.log1p(100), 10);
  });

  it("floors a brand-new creator's zero base score instead of leaving it at zero", () => {
    const approvedAt = new Date(NOW.getTime() - DAY_MS);
    const score = scoreSuggestionCandidate(baseSignals({ creatorApprovedAt: approvedAt }), NOW);
    expect(score).toBe(0.25);
  });

  it("multiplies (not floors) a freshness boost once the base score already clears the floor", () => {
    const approvedAt = new Date(NOW.getTime() - DAY_MS);
    const withFreshness = scoreSuggestionCandidate(
      baseSignals({ momentum: 50, followerCount: 500, creatorApprovedAt: approvedAt }),
      NOW,
    );
    const withoutFreshness = scoreSuggestionCandidate(
      baseSignals({ momentum: 50, followerCount: 500 }),
      NOW,
    );
    expect(withFreshness).toBeCloseTo(withoutFreshness * 1.4, 10);
  });

  it("boosts by mutual-follow count, capped", () => {
    const base = scoreSuggestionCandidate(baseSignals({ momentum: 10 }), NOW);
    const threeMutuals = scoreSuggestionCandidate(
      baseSignals({ momentum: 10, mutualFollowCount: 3 }),
      NOW,
    );
    expect(threeMutuals).toBeCloseTo(base * 1.45, 10);

    const manyMutuals = scoreSuggestionCandidate(
      baseSignals({ momentum: 10, mutualFollowCount: 50 }),
      NOW,
    );
    expect(manyMutuals).toBeCloseTo(base * 1.9, 10);
  });

  it("falls back to the engaged-not-followed boost only when there's no mutual-follow signal", () => {
    const base = scoreSuggestionCandidate(baseSignals({ momentum: 10 }), NOW);
    const engagedOnly = scoreSuggestionCandidate(
      baseSignals({ momentum: 10, engagedNotFollowed: true }),
      NOW,
    );
    expect(engagedOnly).toBeCloseTo(base * 1.35, 10);

    const mutualAndEngaged = scoreSuggestionCandidate(
      baseSignals({ momentum: 10, mutualFollowCount: 3, engagedNotFollowed: true }),
      NOW,
    );
    expect(mutualAndEngaged).toBeCloseTo(base * 1.45, 10);
  });

  it("adds a capped hashtag-overlap boost on top of the social boost", () => {
    const base = scoreSuggestionCandidate(baseSignals({ momentum: 10 }), NOW);

    const threeMatches = scoreSuggestionCandidate(
      baseSignals({ momentum: 10, hashtagMatchingPosts: 3 }),
      NOW,
    );
    expect(threeMatches).toBeCloseTo(base * 1.3, 10);

    const manyMatches = scoreSuggestionCandidate(
      baseSignals({ momentum: 10, hashtagMatchingPosts: 50 }),
      NOW,
    );
    expect(manyMatches).toBeCloseTo(base * 1.4, 10);
  });

  it("floors a mutual-follow candidate's zero base score instead of the boost multiplying zero into zero", () => {
    const score = scoreSuggestionCandidate(baseSignals({ mutualFollowCount: 3 }), NOW);
    expect(score).toBeCloseTo(0.25 * 1.45, 10);
  });

  it("floors an engaged-not-followed candidate's zero base score", () => {
    const score = scoreSuggestionCandidate(baseSignals({ engagedNotFollowed: true }), NOW);
    expect(score).toBeCloseTo(0.25 * 1.35, 10);
  });

  it("floors a hashtag-only candidate's zero base score", () => {
    const score = scoreSuggestionCandidate(baseSignals({ hashtagMatchingPosts: 2 }), NOW);
    expect(score).toBeCloseTo(0.25 * 1.2, 10);
  });

  it("does not floor a candidate with no personalization signal at all", () => {
    expect(scoreSuggestionCandidate(baseSignals(), NOW)).toBe(0);
  });

  it("uses the freshness floor (not a separate signal floor) for a newly-approved creator with a signal", () => {
    const approvedAt = new Date(NOW.getTime() - DAY_MS);
    const score = scoreSuggestionCandidate(
      baseSignals({ mutualFollowCount: 3, creatorApprovedAt: approvedAt }),
      NOW,
    );
    expect(score).toBeCloseTo(0.25 * 1.45, 10);
  });
});

describe("ensureMomentumDiscoveryFloor", () => {
  it("leaves the top slice untouched when it already meets the discovery floor", () => {
    const sorted = [
      candidateOf("a", 10, baseSignals({ momentum: 10 })),
      candidateOf("b", 9, baseSignals({ momentum: 9 })),
      candidateOf("c", 8, baseSignals({ mutualFollowCount: 1 })),
    ];

    expect(ensureMomentumDiscoveryFloor(sorted, 3, 2)).toEqual(sorted);
  });

  it("swaps in a lower-ranked pure-momentum candidate to meet the floor", () => {
    const sorted = [
      candidateOf("a", 10, baseSignals({ mutualFollowCount: 5 })),
      candidateOf("b", 9, baseSignals({ mutualFollowCount: 4 })),
      candidateOf("c", 8, baseSignals({ mutualFollowCount: 3 })),
      candidateOf("d", 7, baseSignals({ momentum: 7 })),
    ];

    const result = ensureMomentumDiscoveryFloor(sorted, 3, 1);

    expect(result.map((candidate) => candidate.creatorId)).toEqual(["a", "b", "d"]);
  });

  it("returns the best-effort top slice when there aren't enough discovery candidates anywhere", () => {
    const sorted = [
      candidateOf("a", 10, baseSignals({ mutualFollowCount: 5 })),
      candidateOf("b", 9, baseSignals({ mutualFollowCount: 4 })),
    ];

    expect(ensureMomentumDiscoveryFloor(sorted, 5, 2)).toEqual(sorted);
  });

  it("never returns more than limit results, even when minDiscoverySlots exceeds limit", () => {
    const sorted = [
      candidateOf("a", 10, baseSignals({ mutualFollowCount: 5 })),
      candidateOf("b", 9, baseSignals({ mutualFollowCount: 4 })),
      candidateOf("c", 8, baseSignals({ momentum: 8 })),
      candidateOf("d", 7, baseSignals({ momentum: 7 })),
      candidateOf("e", 6, baseSignals({ momentum: 6 })),
    ];

    const result = ensureMomentumDiscoveryFloor(sorted, 2, 3);

    expect(result).toHaveLength(2);
    expect(result.map((candidate) => candidate.creatorId)).toEqual(["c", "d"]);
  });
});

describe("suggestionRotationSeed", () => {
  it("is deterministic for the same viewer within the same hour", () => {
    expect(suggestionRotationSeed("viewer-1", NOW)).toBe(suggestionRotationSeed("viewer-1", NOW));
  });

  it("differs across viewers", () => {
    expect(suggestionRotationSeed("viewer-1", NOW)).not.toBe(
      suggestionRotationSeed("viewer-2", NOW),
    );
  });

  it("differs across hour buckets for the same viewer", () => {
    const anHourLater = new Date(NOW.getTime() + 60 * 60 * 1000);
    expect(suggestionRotationSeed("viewer-1", NOW)).not.toBe(
      suggestionRotationSeed("viewer-1", anHourLater),
    );
  });
});
