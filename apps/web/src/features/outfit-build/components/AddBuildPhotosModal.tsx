"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  cropBoxStyleForAspect,
  DEFAULT_IMAGE_MIME_TYPE,
  DEFAULT_POST_LAYOUT,
} from "@/features/creator-dashboard/looks/constants/postModal.constants";
import { MediaFormShell } from "@/shared/components/MediaFormShell";
import { PendingPhotoThumbnailRail } from "@/shared/components/PendingPhotoThumbnailRail";
import { PhotoCropPane } from "@/shared/components/PhotoCropPane";
import { resolvePendingPhotoAssets, usePendingPhotos } from "@/shared/hooks/usePendingPhotos";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { NewOutfitPhoto } from "../api/outfitApi";
import type { OutfitPhotoKind } from "../api/outfitSchemas";

const NO_PHOTOS = 0;
const PHOTO_ASPECT = POST_LAYOUT_ASPECT[DEFAULT_POST_LAYOUT];

type AddBuildPhotosModalProps = {
  kind: OutfitPhotoKind;
  photosLeft: number;
  onAdd: (photos: NewOutfitPhoto[]) => Promise<boolean>;
  onClose: () => void;
};

const toNewPhotos = (urls: string[], imageAssetIds: (string | null)[]): NewOutfitPhoto[] =>
  urls.flatMap((imageUrl, index) => {
    const imageAssetId = imageAssetIds[index];
    return imageAssetId ? [{ imageUrl, imageAssetId }] : [];
  });

export const AddBuildPhotosModal = ({
  kind,
  photosLeft,
  onAdd,
  onClose,
}: AddBuildPhotosModalProps) => {
  const t = useTranslations("outfitBuild.photos");
  const pending = usePendingPhotos(photosLeft);
  const [isSaving, setIsSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const canAdd = pending.photos.length > NO_PHOTOS && !pending.hasUnresolvedCrop;

  const uploadAndAdd = async () => {
    setIsSaving(true);
    setPhotoError(null);
    try {
      const { urls, imageAssetIds } = await resolvePendingPhotoAssets(
        pending.photos,
        DEFAULT_IMAGE_MIME_TYPE,
      );
      const isAdded = await onAdd(toNewPhotos(urls, imageAssetIds));
      if (isAdded) onClose();
    } catch (uploadError) {
      setPhotoError(getErrorMessage(uploadError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={kind === "TRY_ON" ? t("addTryOnTitle") : t("addTitle")}
      description={t("addDescription", { count: photosLeft })}
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
    >
      <MediaFormShell
        photoAspect={PHOTO_ASPECT}
        photos={
          <PhotoCropPane
            pending={pending}
            maxPhotos={photosLeft}
            aspect={PHOTO_ASPECT}
            cropAreaStyle={cropBoxStyleForAspect(PHOTO_ASPECT)}
            error={photoError ?? undefined}
          />
        }
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void uploadAndAdd()} disabled={!canAdd} isLoading={isSaving}>
              {t("add")}
            </Button>
          </>
        }
      >
        <PendingPhotoThumbnailRail
          photos={pending.photos}
          activePhotoId={pending.activePhoto?.id}
          onSelect={pending.setActiveId}
          onRemove={pending.removePhoto}
        />
      </MediaFormShell>
    </Modal>
  );
};
