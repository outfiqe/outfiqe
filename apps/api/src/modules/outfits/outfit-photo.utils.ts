import { toResponsiveImage } from "#lib/responsive-image.utils.js";

import type { OutfitPhotoRow } from "./outfit-photo.repository.js";
import type { OutfitCoverPhotoView, OutfitPhotoView } from "./outfit-photo.types.js";

export const toOutfitPhotoView = ({
  id,
  kind,
  status,
  imageUrl,
  imageAsset,
  uploader,
  coverPosition,
  createdAt,
}: OutfitPhotoRow): OutfitPhotoView => ({
  id,
  kind,
  status,
  image: toResponsiveImage(imageUrl, imageAsset),
  uploadedBy: uploader,
  coverPosition,
  createdAt: createdAt.toISOString(),
});

export const toCoverPhotoView = ({
  id,
  imageUrl,
  imageAsset,
}: OutfitPhotoRow): OutfitCoverPhotoView => ({
  id,
  image: toResponsiveImage(imageUrl, imageAsset),
});

export const groupCoversByOutfit = (
  coverRows: (OutfitPhotoRow & { outfitId: string })[],
): Map<string, OutfitCoverPhotoView[]> => {
  const coversByOutfitId = new Map<string, OutfitCoverPhotoView[]>();
  for (const coverRow of coverRows) {
    const outfitCovers = coversByOutfitId.get(coverRow.outfitId) ?? [];
    outfitCovers.push(toCoverPhotoView(coverRow));
    coversByOutfitId.set(coverRow.outfitId, outfitCovers);
  }
  return coversByOutfitId;
};
