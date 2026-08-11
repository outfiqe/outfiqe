import type { CreatorStatus } from "../../generated/prisma/enums.js";

export type CreatorProfile = {
  userId: string;
  name: string;
  email: string;
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
  heightCm: number | null;
  creatorStatus: CreatorStatus;
  postsCount: number;
  followerCount: number;
  taggedPiecesCount: number;
  isFollowing: boolean;
};
