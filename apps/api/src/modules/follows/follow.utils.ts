import { FollowTargetType } from "#generated/prisma/enums.js";
import type { BrandRecord } from "#modules/brands/brand.types.js";
import type { UserRecord } from "#modules/users/user.types.js";

import {
  FOLLOWER_COUNT_SCORE_WEIGHT,
  MOMENTUM_SCORE_WEIGHT,
  MUTUAL_FOLLOW_BOOST_CAP,
  MUTUAL_FOLLOW_BOOST_PER_CONNECTION,
  NEW_CREATOR_BASE_SCORE_FLOOR,
  NEW_CREATOR_FRESHNESS_MULTIPLIER,
  NEW_CREATOR_FRESHNESS_WINDOW_DAYS,
  SUGGESTION_ENGAGED_CREATOR_BOOST,
  SUGGESTION_HASHTAG_BOOST_CAP,
  SUGGESTION_HASHTAG_BOOST_PER_MATCHING_POST,
  SUGGESTION_HASHTAG_MATCHING_POST_CAP,
  SUGGESTION_SIGNAL_BASE_SCORE_FLOOR,
} from "./follow.constants.js";
import type { FollowTargetTypeParam } from "./follow.schemas.js";
import type {
  CandidateSignals,
  FollowerView,
  FollowTarget,
  ScoredSuggestionCandidate,
} from "./follow.types.js";

export const toPrismaTargetType = (param: FollowTargetTypeParam): FollowTargetType =>
  param === "user" ? FollowTargetType.USER : FollowTargetType.BRAND;

export const toFollowTarget = (user: UserRecord): FollowTarget => ({
  kind: "user",
  id: user.id,
  name: user.name,
  handle: user.handle,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
  followerCount: user.followerCount,
});

export const toFollowerView = (user: UserRecord, isFollowedByViewer: boolean): FollowerView => ({
  id: user.id,
  name: user.name,
  handle: user.handle,
  isCreator: user.isCreator,
  isFollowedByViewer,
});

export const toBrandFollowTarget = (brand: BrandRecord): FollowTarget => ({
  kind: "brand",
  id: brand.id,
  name: brand.name,
  followerCount: brand.followerCount,
});

const NEW_CREATOR_FRESHNESS_WINDOW_MS = NEW_CREATOR_FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const isWithinNewCreatorFreshnessWindow = (
  creatorApprovedAt: Date | null,
  now: Date,
): boolean =>
  creatorApprovedAt !== null &&
  now.getTime() - creatorApprovedAt.getTime() <= NEW_CREATOR_FRESHNESS_WINDOW_MS;

export const isPureMomentumSignal = (signals: CandidateSignals): boolean =>
  signals.mutualFollowCount === 0 &&
  !signals.engagedNotFollowed &&
  signals.hashtagMatchingPosts === 0;

export const scoreSuggestionCandidate = (signals: CandidateSignals, now: Date): number => {
  let baseScore =
    MOMENTUM_SCORE_WEIGHT * Math.log1p(signals.momentum) +
    FOLLOWER_COUNT_SCORE_WEIGHT * Math.log1p(signals.followerCount);

  if (isWithinNewCreatorFreshnessWindow(signals.creatorApprovedAt, now)) {
    baseScore = Math.max(
      baseScore * NEW_CREATOR_FRESHNESS_MULTIPLIER,
      NEW_CREATOR_BASE_SCORE_FLOOR,
    );
  } else if (!isPureMomentumSignal(signals)) {
    baseScore = Math.max(baseScore, SUGGESTION_SIGNAL_BASE_SCORE_FLOOR);
  }

  let multiplier = 1;
  if (signals.mutualFollowCount > 0) {
    multiplier += Math.min(
      MUTUAL_FOLLOW_BOOST_PER_CONNECTION * signals.mutualFollowCount,
      MUTUAL_FOLLOW_BOOST_CAP,
    );
  } else if (signals.engagedNotFollowed) {
    multiplier += SUGGESTION_ENGAGED_CREATOR_BOOST;
  }

  multiplier += Math.min(
    SUGGESTION_HASHTAG_BOOST_PER_MATCHING_POST *
      Math.min(signals.hashtagMatchingPosts, SUGGESTION_HASHTAG_MATCHING_POST_CAP),
    SUGGESTION_HASHTAG_BOOST_CAP,
  );

  return baseScore * multiplier;
};

export const ensureMomentumDiscoveryFloor = (
  sortedCandidates: ScoredSuggestionCandidate[],
  limit: number,
  minDiscoverySlots: number,
): ScoredSuggestionCandidate[] => {
  const initial = sortedCandidates.slice(0, limit);
  const discoveryCount = initial.filter((candidate) =>
    isPureMomentumSignal(candidate.signals),
  ).length;
  if (discoveryCount >= minDiscoverySlots) return initial;

  const initialIds = new Set(initial.map((candidate) => candidate.creatorId));
  const nonDiscoveryInInitial = initial.filter(
    (candidate) => !isPureMomentumSignal(candidate.signals),
  );
  const neededCount = Math.min(minDiscoverySlots - discoveryCount, nonDiscoveryInInitial.length);
  const extraDiscoveryCandidates = sortedCandidates
    .filter(
      (candidate) =>
        isPureMomentumSignal(candidate.signals) && !initialIds.has(candidate.creatorId),
    )
    .slice(0, neededCount);
  if (extraDiscoveryCandidates.length === 0) return initial;

  const droppedIds = new Set(
    nonDiscoveryInInitial
      .slice(-extraDiscoveryCandidates.length)
      .map((candidate) => candidate.creatorId),
  );

  return [
    ...initial.filter((candidate) => !droppedIds.has(candidate.creatorId)),
    ...extraDiscoveryCandidates,
  ].sort((a, b) => b.score - a.score);
};

const ROTATION_SEED_HOUR_MS = 60 * 60 * 1000;

const hashStringToInt = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
};

export const suggestionRotationSeed = (viewerId: string, now: Date): number =>
  hashStringToInt(viewerId) + Math.floor(now.getTime() / ROTATION_SEED_HOUR_MS);
