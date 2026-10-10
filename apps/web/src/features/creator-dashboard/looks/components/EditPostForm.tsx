"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormBanner, getCroppedImageFile, toast } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { PublicProduct } from "@/features/products/api/productSchemas";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { CreatorLookEditDetail } from "../api/creatorLooksSchemas";
import {
  cropBoxStyleForAspect,
  DEFAULT_IMAGE_MIME_TYPE,
  SEARCH_DEBOUNCE_MS,
} from "../constants/postModal.constants";
import { useEditLookPhotos } from "../hooks/useEditLookPhotos";
import { useMaxTaggedProducts } from "../hooks/useMaxTaggedProducts";
import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { useUpdateLook } from "../hooks/useUpdateLook";
import { type EditLookFormInput, editLookFormSchema } from "../schemas/lookForm.schema";
import {
  collectTaggedProductSizeErrors,
  summarizeTaggedProductErrors,
} from "../utils/taggedProductSizeErrors";
import { EditPostPhotoStrip } from "./EditPostPhotoStrip";
import { ProductTagPicker } from "./ProductTagPicker";
import { StagingPhotoCropper } from "./StagingPhotoCropper";

type EditPostFormProps = {
  lookId: string;
  detail: CreatorLookEditDetail;
  onClose: () => void;
};

export const EditPostForm = ({ lookId, detail, onClose }: EditPostFormProps) => {
  const maxTaggedProducts = useMaxTaggedProducts();
  const update = useUpdateLook();
  const photoAspect = POST_LAYOUT_ASPECT[detail.layout];
  const cropBoxStyle = cropBoxStyleForAspect(photoAspect);

  const {
    existingUrls,
    newPhotos,
    stagingPhoto,
    setStagingPhoto,
    photoError,
    setPhotoError,
    isProcessingPhotos,
    setIsProcessingPhotos,
    fileInputRef,
    canAddPhoto,
    revokeNewPhoto,
    handleFilesSelected,
    confirmStagingPhoto,
    cancelStagingPhoto,
    removeExistingPhoto,
    removeNewPhoto,
  } = useEditLookPhotos(detail.imageUrls);

  const [productFilter, setProductFilter] = useState("");
  const [searchProductCache, setSearchProductCache] = useState<Record<string, PublicProduct>>({});
  const debouncedFilter = useDebouncedValue(productFilter, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedFilter.trim().length > 0;
  const taggableProducts = useTaggableProducts(debouncedFilter, isSearching);

  const form = useForm<EditLookFormInput>({
    resolver: zodResolver(editLookFormSchema),
    defaultValues: {
      caption: detail.caption ?? "",
      taggedProducts: detail.taggedProducts.map(({ productId, sizeWorn }) => ({
        productId,
        sizeWorn,
      })),
    },
  });

  const taggedProducts = form.watch("taggedProducts");
  const taggedProductErrors = form.formState.errors.taggedProducts;
  const sizeErrors = collectTaggedProductSizeErrors(taggedProductErrors, taggedProducts);

  const detailProductCache = useMemo(
    () => Object.fromEntries(detail.taggedProducts.map((tag) => [tag.productId, tag.product])),
    [detail.taggedProducts],
  );
  const productCache = { ...detailProductCache, ...searchProductCache };

  const reviewByProductId = useMemo(
    () =>
      Object.fromEntries(
        detail.taggedProducts.map((tag) => [
          tag.productId,
          {
            reviewStatus: tag.reviewStatus,
            rejectionReason: tag.rejectionReason,
            rejectionNote: tag.rejectionNote,
            canReRequest: tag.canReRequest,
          },
        ]),
      ),
    [detail.taggedProducts],
  );
  const hasUnresolvedTag = detail.taggedProducts.some((tag) => tag.reviewStatus !== "APPROVED");

  const close = () => {
    newPhotos.forEach(revokeNewPhoto);
    if (stagingPhoto) revokeNewPhoto(stagingPhoto);
    onClose();
  };

  const toggleProduct = (product: PublicProduct) => {
    const isTagged = taggedProducts.some((tag) => tag.productId === product.id);

    if (isTagged) {
      form.setValue(
        "taggedProducts",
        taggedProducts.filter((tag) => tag.productId !== product.id),
        { shouldValidate: true },
      );
      return;
    }

    if (taggedProducts.length >= maxTaggedProducts) return;

    setSearchProductCache((cache) => ({ ...cache, [product.id]: product }));
    form.setValue("taggedProducts", [...taggedProducts, { productId: product.id, sizeWorn: "" }], {
      shouldValidate: true,
    });
  };

  const removeTag = (productId: string) => {
    form.setValue(
      "taggedProducts",
      taggedProducts.filter((tag) => tag.productId !== productId),
      { shouldValidate: true },
    );
  };

  const setSizeWorn = (productId: string, sizeWorn: string) => {
    form.setValue(
      "taggedProducts",
      taggedProducts.map((tag) => (tag.productId === productId ? { ...tag, sizeWorn } : tag)),
      { shouldValidate: true },
    );
  };

  const submitEdit = form.handleSubmit(async (values) => {
    if (existingUrls.length + newPhotos.length === 0) {
      setPhotoError("Add at least one photo.");
      return;
    }

    setIsProcessingPhotos(true);
    setPhotoError(null);
    try {
      let uploadedNewUrls: string[] = [];
      let uploadedNewAssetIds: (string | null)[] = [];
      if (newPhotos.length > 0) {
        const files = await Promise.all(
          newPhotos.map((photo) => {
            if (!photo.croppedAreaPixels) {
              throw new Error("That photo isn't cropped yet — reselect it and try again.");
            }
            return getCroppedImageFile(
              photo.objectUrl,
              photo.croppedAreaPixels,
              photo.file.name,
              photo.file.type || DEFAULT_IMAGE_MIME_TYPE,
            );
          }),
        );
        const uploaded = await uploadsApi.uploadWithPipeline(files);
        uploadedNewUrls = uploaded.map((file) => file.url);
        uploadedNewAssetIds = uploaded.map((file) => file.assetId);
      }

      await update.mutateAsync({
        lookId,
        input: {
          ...values,
          imageUrls: [...existingUrls, ...uploadedNewUrls],
          imageAssetIds: [...existingUrls.map(() => null), ...uploadedNewAssetIds],
        },
      });
      toast.success("Drop updated");
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsProcessingPhotos(false);
    }
  });

  const isSaving = isProcessingPhotos || update.isPending;

  return (
    <>
      {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}

      <div className="space-y-5">
        <EditPostPhotoStrip
          existingUrls={existingUrls}
          newPhotos={newPhotos}
          canAddPhoto={canAddPhoto}
          hasStagingPhoto={Boolean(stagingPhoto)}
          photoError={photoError}
          fileInputRef={fileInputRef}
          handleFilesSelected={handleFilesSelected}
          removeExistingPhoto={removeExistingPhoto}
          removeNewPhoto={removeNewPhoto}
        />

        {stagingPhoto && (
          <StagingPhotoCropper
            stagingPhoto={stagingPhoto}
            setStagingPhoto={setStagingPhoto}
            photoAspect={photoAspect}
            cropBoxStyle={cropBoxStyle}
            cancelStagingPhoto={cancelStagingPhoto}
            confirmStagingPhoto={confirmStagingPhoto}
          />
        )}

        <label htmlFor="edit-post-form-caption" className="sr-only">
          Caption
        </label>
        <textarea
          id="edit-post-form-caption"
          rows={4}
          placeholder="Write your caption here…."
          className="w-full resize-none rounded-lg border border-border bg-transparent p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          {...form.register("caption")}
        />

        {hasUnresolvedTag && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Your drop is live. Tags marked <span className="font-medium">In review</span> or{" "}
            <span className="font-medium">Declined</span> stay hidden on the drop until the brand
            approves them — everything else about the drop is unaffected.
          </p>
        )}

        <ProductTagPicker
          taggedProducts={taggedProducts}
          maxTaggedProducts={maxTaggedProducts}
          productCache={productCache}
          reviewByProductId={reviewByProductId}
          initialExpanded={hasUnresolvedTag}
          onToggleProduct={toggleProduct}
          onRemoveTag={removeTag}
          onSizeChange={setSizeWorn}
          onReRequestTag={() => void submitEdit()}
          isReRequestPending={isSaving}
          sizeErrors={sizeErrors}
          productFilter={productFilter}
          onFilterChange={setProductFilter}
          debouncedFilter={debouncedFilter}
          isSearching={isSearching}
          isSearchLoading={taggableProducts.isLoading}
          searchResults={taggableProducts.data?.products ?? []}
          error={summarizeTaggedProductErrors(taggedProductErrors, sizeErrors)}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          onClick={() => void submitEdit()}
          disabled={Boolean(stagingPhoto)}
          isLoading={isSaving}
        >
          Save changes
        </Button>
      </div>
    </>
  );
};
