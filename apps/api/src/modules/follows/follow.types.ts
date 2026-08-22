import type { CreatorStatus, FollowTargetType } from "#generated/prisma/enums.js";

export type UserFollowTarget = {
  kind: "user";
  id: string;
  name: string;
  handle: string;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
  followerCount: number;
};

export type BrandFollowTarget = {
  kind: "brand";
  id: string;
  name: string;
  followerCount: number;
};

export type FollowTarget = UserFollowTarget | BrandFollowTarget;

export type FollowResult = {
  following: boolean;
  followerCount: number;
};

export type FollowerView = {
  id: string;
  name: string;
  handle: string;
  isCreator: boolean;
  isFollowedByViewer: boolean;
};

export type FollowersPage = {
  items: FollowerView[];
  nextCursor: string | null;
};

export type FollowingPage = {
  items: FollowTarget[];
  nextCursor: string | null;
};

export type MutualFollowCandidate = {
  candidateId: string;
  mutualCount: number;
};

export type CreatorMomentumCacheEntry = {
  creatorId: string;
  momentum: number;
};

export type CandidateSignals = {
  mutualFollowCount: number;
  engagedNotFollowed: boolean;
  hashtagMatchingPosts: number;
  momentum: number;
  followerCount: number;
  creatorApprovedAt: Date | null;
};

export type ScoredSuggestionCandidate = {
  creatorId: string;
  signals: CandidateSignals;
  score: number;
};

export type SuggestionSnapshotCursor = {
  sessionId: string;
  offset: number;
};

export type SuggestedCreatorsPage = {
  items: FollowTarget[];
  nextCursor: string | null;
};

export type { FollowTargetType };
