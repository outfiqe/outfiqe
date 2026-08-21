import type { CreatorStatus } from "#generated/prisma/enums.js";
import type { FeaturedBadgeView } from "#modules/badges/badge.types.js";

export type CreatorProfile = {
  userId: string;
  name: string;
  email: string;
  handle: string;
  avatarUrl: string | null;
  heightCm: number | null;
  showHeight: boolean;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
};

export type CreatorProfilePage = {
  creators: CreatorProfile[];
  nextCursor: string | null;
};

export type PublicCreatorProfile = {
  userId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  heightCm: number | null;
  showHeight: boolean;
  creatorStatus: CreatorStatus;
  postsCount: number;
  followerCount: number;
  followingCount: number;
  taggedPiecesCount: number;
  isFollowing: boolean;
  featuredBadges: FeaturedBadgeView[];
  titleBadge: FeaturedBadgeView | null;
};

export type CreatorSearchResult = {
  userId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  followerCount: number;
};

export type CreatorSearchPage = {
  creators: CreatorSearchResult[];
  nextCursor: string | null;
  total: number;
};

export type CreatorSearchCursor = { offset: number };
