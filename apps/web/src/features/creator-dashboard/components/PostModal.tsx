"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormBanner, Modal, toast } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/features/auth/context/AuthContext";
import type { PublicProduct } from "@/features/products/api/productSchemas";
import { MediaFormShell } from "@/shared/components/MediaFormShell";
import { PendingPhotoThumbnailRail } from "@/shared/components/PendingPhotoThumbnailRail";
import { PhotoCropPane } from "@/shared/components/PhotoCropPane";
import { resolvePendingPhotoUrls, usePendingPhotos } from "@/shared/hooks/usePendingPhotos";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useCreateLook } from "../hooks/useCreateLook";
import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { type LookFormInput, lookFormSchema } from "../schemas/lookForm.schema";
import {
  CROP_BOX_STYLE,
  DEFAULT_IMAGE_MIME_TYPE,
  MAX_PHOTOS,
  MAX_TAGGED_PRODUCTS,
  PHOTO_ASPECT,
  SEARCH_DEBOUNCE_MS,
} from "./PostModal.constants";
import { ProductTagPicker } from "./ProductTagPicker";

type PostModalProps = {
  open: boolean;
  onClose: () => void;
};

export const PostModal = ({ open, onClose }: PostModalProps) => {
  const { state } = useAuth();
  const [productFilter, setProductFilter] = useState("");
  const [productCache, setProductCache] = useState<Record<string, PublicProduct>>({});
  const debouncedFilter = useDebouncedValue(productFilter, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedFilter.trim().length > 0;
  const taggableProducts = useTaggableProducts(debouncedFilter, open && isSearching);
  const create = useCreateLook();

  const form = useForm<LookFormInput>({
    resolver: zodResolver(lookFormSchema),
    defaultValues: { imageUrls: [], caption: "", taggedProducts: [] },
  });

  const taggedProducts = form.watch("taggedProducts");

  const pending = usePendingPhotos(MAX_PHOTOS);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const close = () => {
    form.reset();
    setProductFilter("");
    setProductCache({});
    setPhotoError(null);
    pending.reset();
    onClose();
  };

  const submitLook = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success("Look posted");
      close();
    } catch {
      return;
    }
  });

  const handlePostLook = async () => {
    if (pending.photos.length === 0) return;
    setIsProcessingPhotos(true);
    setPhotoError(null);
    try {
      const urls = await resolvePendingPhotoUrls(pending.photos, DEFAULT_IMAGE_MIME_TYPE);
      form.setValue("imageUrls", urls, { shouldValidate: true });
      await submitLook();
    } catch {
      setPhotoError("Couldn't process those photos. Try again.");
    } finally {
      setIsProcessingPhotos(false);
    }
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

    if (taggedProducts.length >= MAX_TAGGED_PRODUCTS) return;

    setProductCache((cache) => ({ ...cache, [product.id]: product }));
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

  const searchResults = taggableProducts.data?.products ?? [];

  return (
    <Modal
      open={open}
      onClose={close}
      title="New post"
      description="Share a fit and tag the pieces you're wearing."
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
    >
      {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

      <MediaFormShell
        photoAspect={PHOTO_ASPECT}
        photos={
          <PhotoCropPane
            pending={pending}
            maxPhotos={MAX_PHOTOS}
            aspect={PHOTO_ASPECT}
            cropAreaStyle={CROP_BOX_STYLE}
            error={photoError ?? form.formState.errors.imageUrls?.message}
          />
        }
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => void handlePostLook()}
              disabled={pending.photos.length === 0 || isProcessingPhotos || create.isPending}
            >
              {isProcessingPhotos ? "Processing…" : create.isPending ? "Posting…" : "Post look"}
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

        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: getAvatarColor(state.user?.id ?? "") }}
          >
            {initialsFor(state.user?.name ?? "")}
          </span>
          <span className="text-sm font-semibold text-foreground">{state.user?.name}</span>
        </div>

        <textarea
          rows={4}
          placeholder="Write your caption here…."
          className="w-full resize-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          {...form.register("caption")}
        />

        <ProductTagPicker
          taggedProducts={taggedProducts}
          maxTaggedProducts={MAX_TAGGED_PRODUCTS}
          productCache={productCache}
          onToggleProduct={toggleProduct}
          onRemoveTag={removeTag}
          onSizeChange={setSizeWorn}
          productFilter={productFilter}
          onFilterChange={setProductFilter}
          debouncedFilter={debouncedFilter}
          isSearching={isSearching}
          isSearchLoading={taggableProducts.isLoading}
          searchResults={searchResults}
          error={form.formState.errors.taggedProducts?.message}
        />
      </MediaFormShell>
    </Modal>
  );
};
