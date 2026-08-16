import type { CreatorStatus } from "#generated/prisma/enums.js";

export type CreatorProfile = {
  userId: string;
  name: string;
  email: string;
  handle: string;
  avatarUrl: string | null;
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
  creatorStatus: CreatorStatus;
  postsCount: number;
  followerCount: number;
  followingCount: number;
  taggedPiecesCount: number;
  isFollowing: boolean;
};
