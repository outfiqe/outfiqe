import type { UserRole } from "#generated/prisma/enums.js";

import type { OutfitPersonView, OutfitSnapshotItem } from "./outfit.types.js";
import type { OutfitCoverPhotoView, OutfitPhotoView } from "./outfit-photo.types.js";

export type PublicBuildItem = OutfitSnapshotItem & {
  isInStock: boolean;
  sizes: { label: string; isInStock: boolean }[];
};

export type PublicBuildCard = {
  id: string;
  title: string | null;
  previewImageUrls: string[];
  coverPhotos: OutfitCoverPhotoView[];
  itemCount: number;
  total: number;
  isFullyAvailable: boolean;
  contributors: OutfitPersonView[];
  likeCount: number;
  saveCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  madePublicAt: string | null;
};

export type PublicBuildDetail = PublicBuildCard & {
  visibility: "SHARED" | "PUBLIC";
  items: PublicBuildItem[];
  lockedAt: string;
  photos: OutfitPhotoView[];
  canComment: boolean;
};

export type PublicBuildPage = { items: PublicBuildCard[]; nextCursor: string | null };

export type OutfitCommentView = {
  id: string;
  body: string;
  author: OutfitPersonView;
  parentCommentId: string | null;
  replyCount: number;
  createdAt: string;
  isMine: boolean;
};

export type OutfitCommentPage = { items: OutfitCommentView[]; nextCursor: string | null };

export type ModerationPrincipal = { userId: string; role: UserRole };
