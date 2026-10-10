import type { ResponsiveImage } from "@outfiqe/types";

import type { OutfitPhotoKind, OutfitPhotoStatus } from "#generated/prisma/enums.js";

import type { OutfitPersonView } from "../outfit.types.js";

export type OutfitPhotoView = {
  id: string;
  kind: OutfitPhotoKind;
  status: OutfitPhotoStatus;
  image: ResponsiveImage;
  uploadedBy: OutfitPersonView | null;
  coverPosition: number | null;
  createdAt: string;
};

export type OutfitCoverPhotoView = {
  id: string;
  image: ResponsiveImage;
};

export type OutfitPhotoLimitsView = {
  maxPhotosPerMember: number;
  maxPhotosPerBoard: number;
  maxCoverPhotos: number;
};
