"use client";

import { Button, FormBanner, Label, Modal, Select, toast } from "@outfiqe/design-system";
import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import {
  cropBoxStyleForAspect,
  DEFAULT_IMAGE_MIME_TYPE,
  DEFAULT_POST_LAYOUT,
  MAX_PHOTOS,
} from "@/features/creator-dashboard/components/PostModal.constants";
import { useMySizeByProductType } from "@/features/saved-sizes";
import { MediaFormShell } from "@/shared/components/MediaFormShell";
import { PendingPhotoThumbnailRail } from "@/shared/components/PendingPhotoThumbnailRail";
import { PhotoCropPane } from "@/shared/components/PhotoCropPane";
import { resolvePendingPhotoAssets, usePendingPhotos } from "@/shared/hooks/usePendingPhotos";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { OutfitBoard, OutfitProduct } from "../api/outfitSchemas";
import { usePublishBuildLook } from "../hooks/useBuildLook";

const CAPTION_MAX_LENGTH = 280;
const NO_PHOTOS = 0;
const NO_SIZE_VALUE = "";
const PHOTO_ASPECT = POST_LAYOUT_ASPECT[DEFAULT_POST_LAYOUT];

type PublishLookModalProps = {
  board: OutfitBoard;
  onPublished: (lookId: string) => void;
  onClose: () => void;
};

const pickDefaultSize = (product: OutfitProduct, mySize: string | undefined): string => {
  const offeredLabels = product.sizes.map((size) => size.label);
  if (mySize && offeredLabels.includes(mySize)) return mySize;
  const [firstOfferedLabel = NO_SIZE_VALUE] = offeredLabels;
  return firstOfferedLabel;
};

export const PublishLookModal = ({ board, onPublished, onClose }: PublishLookModalProps) => {
  const t = useTranslations("outfitBuild.publish");
  const captionId = useId();
  const mySizeByProductType = useMySizeByProductType();
  const publishLook = usePublishBuildLook(board.id);
  const pending = usePendingPhotos(MAX_PHOTOS);
  const products = board.slots.flatMap((slot) => slot.items.map((item) => item.product));

  const [caption, setCaption] = useState(board.title ?? "");
  const [sizeByProductId, setSizeByProductId] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      products.map((product) => [
        product.id,
        pickDefaultSize(product, mySizeByProductType.get(product.productTypeId)),
      ]),
    ),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const hasEverySize = products.every((product) => Boolean(sizeByProductId[product.id]));
  const canPost = pending.photos.length > NO_PHOTOS && !pending.hasUnresolvedCrop && hasEverySize;

  const postLook = async () => {
    setIsUploading(true);
    setPhotoError(null);
    let resolvedPhotos: Awaited<ReturnType<typeof resolvePendingPhotoAssets>>;
    try {
      resolvedPhotos = await resolvePendingPhotoAssets(pending.photos, DEFAULT_IMAGE_MIME_TYPE);
    } catch (uploadError) {
      setPhotoError(getErrorMessage(uploadError));
      return;
    } finally {
      setIsUploading(false);
    }

    const { look } = await publishLook.mutateAsync({
      imageUrls: resolvedPhotos.urls,
      imageAssetIds: resolvedPhotos.imageAssetIds,
      caption: caption.trim() || undefined,
      sizesWorn: products.map((product) => ({
        productId: product.id,
        sizeWorn: sizeByProductId[product.id] ?? NO_SIZE_VALUE,
      })),
    });
    toast.success(t("posted"));
    onPublished(look.id);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("title")}
      description={t("description")}
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
    >
      {publishLook.isError && <FormBanner>{getErrorMessage(publishLook.error)}</FormBanner>}

      <MediaFormShell
        photoAspect={PHOTO_ASPECT}
        photos={
          <PhotoCropPane
            pending={pending}
            maxPhotos={MAX_PHOTOS}
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
            <Button
              onClick={() => void postLook().catch(() => undefined)}
              disabled={!canPost}
              isLoading={isUploading || publishLook.isPending}
            >
              {t("post")}
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

        <div className="space-y-1.5">
          <Label htmlFor={captionId}>{t("caption")}</Label>
          <textarea
            id={captionId}
            rows={3}
            maxLength={CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:border-foreground"
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">{t("sizesTitle")}</legend>
          {products.map((product) => {
            const sizeSelectId = `${captionId}-size-${product.id}`;
            return (
              <div key={product.id} className="space-y-1">
                <Label htmlFor={sizeSelectId}>{t("sizeFor", { product: product.name })}</Label>
                <Select
                  id={sizeSelectId}
                  value={sizeByProductId[product.id] ?? NO_SIZE_VALUE}
                  onChange={(event) =>
                    setSizeByProductId((current) => ({
                      ...current,
                      [product.id]: event.target.value,
                    }))
                  }
                >
                  <option value={NO_SIZE_VALUE} disabled>
                    {t("pickSize")}
                  </option>
                  {product.sizes.map((size) => (
                    <option key={size.label} value={size.label}>
                      {size.label}
                    </option>
                  ))}
                </Select>
              </div>
            );
          })}
        </fieldset>
      </MediaFormShell>
    </Modal>
  );
};
