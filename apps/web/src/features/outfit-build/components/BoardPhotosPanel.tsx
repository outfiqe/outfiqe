"use client";

import { Button } from "@outfiqe/design-system";
import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { AppImage } from "@/shared/components/AppImage";
import { cn } from "@/shared/lib/cn";

import type { NewOutfitPhoto } from "../api/outfitApi";
import type { OutfitBoard, OutfitPhoto, OutfitPhotoKind } from "../api/outfitSchemas";
import { AddBuildPhotosModal } from "./AddBuildPhotosModal";

const NO_PHOTOS = 0;
const PHOTO_THUMBNAIL_SIZE = "(min-width: 1024px) 100px, 30vw";

type BoardPhotosPanelProps = {
  board: OutfitBoard;
  currentUserId: string | undefined;
  isTryOnOn: boolean;
  onAddPhotos: (kind: OutfitPhotoKind, photos: NewOutfitPhoto[]) => Promise<boolean>;
  onRemovePhoto: (photoId: string) => void;
  onSetCovers: (photoIds: string[]) => void;
};

const orderedCoverIds = (photos: OutfitPhoto[]): string[] =>
  photos
    .filter((photo) => photo.coverPosition !== null)
    .sort((left, right) => (left.coverPosition ?? NO_PHOTOS) - (right.coverPosition ?? NO_PHOTOS))
    .map(({ id }) => id);

export const BoardPhotosPanel = ({
  board,
  currentUserId,
  isTryOnOn,
  onAddPhotos,
  onRemovePhoto,
  onSetCovers,
}: BoardPhotosPanelProps) => {
  const t = useTranslations("outfitBuild.photos");
  const titleId = useId();
  const [addingKind, setAddingKind] = useState<OutfitPhotoKind | null>(null);
  const { photos, limits, myRole, status } = board;
  const isOwner = myRole === "OWNER";
  const isMember = myRole !== "VIEWER";
  const canChangePhotos = isMember && status !== "ARCHIVED";
  const myPhotoCount = photos.filter((photo) => photo.uploadedBy?.id === currentUserId).length;
  const photosLeft = Math.min(
    limits.maxPhotosPerMember - myPhotoCount,
    limits.maxPhotosPerBoard - photos.length,
  );
  const coverIds = orderedCoverIds(photos);
  const buildPhotos = photos.filter((photo) => photo.kind === "COVER");
  const tryOnPhotos = photos.filter((photo) => photo.kind === "TRY_ON");

  const toggleCover = (photoId: string) => {
    const isCover = coverIds.includes(photoId);
    if (!isCover && coverIds.length >= limits.maxCoverPhotos) return;
    onSetCovers(isCover ? coverIds.filter((id) => id !== photoId) : [...coverIds, photoId]);
  };

  const renderGallery = (galleryPhotos: OutfitPhoto[], emptyText: string, canBeCover: boolean) => {
    if (galleryPhotos.length === NO_PHOTOS) {
      return <p className="text-sm text-muted-foreground">{emptyText}</p>;
    }
    return (
      <ul className="grid grid-cols-3 gap-2">
        {galleryPhotos.map((photo) => {
          const isCover = coverIds.includes(photo.id);
          const canRemove = canChangePhotos && (isOwner || photo.uploadedBy?.id === currentUserId);
          return (
            <li
              key={photo.id}
              className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted"
            >
              <AppImage
                image={photo.image}
                src={photo.image.url}
                alt={
                  photo.uploadedBy ? t("photoBy", { name: photo.uploadedBy.name }) : t("photoAlt")
                }
                fill
                sizes={PHOTO_THUMBNAIL_SIZE}
              />
              {isOwner && canChangePhotos && canBeCover && (
                <button
                  type="button"
                  aria-pressed={isCover}
                  aria-label={isCover ? t("removeCover") : t("makeCover")}
                  onClick={() => toggleCover(photo.id)}
                  className={cn(
                    "absolute left-1 top-1 cursor-pointer rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-foreground",
                    isCover ? "bg-foreground text-background" : "bg-background/80 text-foreground",
                  )}
                >
                  <Star className="size-3.5" aria-hidden fill={isCover ? "currentColor" : "none"} />
                </button>
              )}
              {canRemove && (
                <button
                  type="button"
                  aria-label={t("remove")}
                  onClick={() => onRemovePhoto(photo.id)}
                  className="absolute right-1 top-1 cursor-pointer rounded-full bg-background/80 p-1.5 text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <div>
        <h2 id={titleId} className="text-sm font-semibold text-foreground">
          {t("title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isOwner ? t("ownerHint", { count: limits.maxCoverPhotos }) : t("memberHint")}
        </p>
      </div>

      {renderGallery(buildPhotos, t("empty"), true)}
      {canChangePhotos && (
        <Button
          size="sm"
          variant="outline"
          disabled={photosLeft <= NO_PHOTOS}
          onClick={() => setAddingKind("COVER")}
        >
          {photosLeft > NO_PHOTOS ? t("addPhotos") : t("limitReached")}
        </Button>
      )}

      {isTryOnOn && (
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-sm font-semibold text-foreground">{t("tryOnTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("tryOnHint")}</p>
          {renderGallery(tryOnPhotos, t("tryOnEmpty"), false)}
          {canChangePhotos && (
            <Button
              size="sm"
              variant="outline"
              disabled={photosLeft <= NO_PHOTOS}
              onClick={() => setAddingKind("TRY_ON")}
            >
              {t("addTryOn")}
            </Button>
          )}
        </div>
      )}

      {addingKind && (
        <AddBuildPhotosModal
          kind={addingKind}
          photosLeft={photosLeft}
          onAdd={(newPhotos) => onAddPhotos(addingKind, newPhotos)}
          onClose={() => setAddingKind(null)}
        />
      )}
    </section>
  );
};
