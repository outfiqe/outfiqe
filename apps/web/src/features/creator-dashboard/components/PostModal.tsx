"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  CropSurface,
  FormBanner,
  getCroppedImageFile,
  HiddenFileInput,
  Modal,
  toast,
} from "@outfiqe/design-system";
import { ImagePlus, Plus, X } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/features/auth/context/AuthContext";
import type { PublicProduct } from "@/features/products/api/productSchemas";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useCreateLook } from "../hooks/useCreateLook";
import { usePendingPhotos } from "../hooks/usePendingPhotos";
import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { type LookFormInput, lookFormSchema } from "../schemas/lookForm.schema";
import { PendingPhotoThumbnailRail } from "./PendingPhotoThumbnailRail";
import { ProductTagPicker } from "./ProductTagPicker";

const SEARCH_DEBOUNCE_MS = 300;
const MAX_TAGGED_PRODUCTS = 6;
const MAX_PHOTOS = 6;
const PHOTO_ASPECT = 4 / 5;
const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";
const LEFT_PANE_WIDTH_PX = 380;
const MODAL_ROW_HEIGHT_PX = LEFT_PANE_WIDTH_PX / PHOTO_ASPECT;
const CROP_BOX_STYLE = { width: "100%", height: "100%", aspectRatio: "4 / 5" };

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
      const files = await Promise.all(
        pending.photos.map((photo) =>
          photo.croppedAreaPixels
            ? getCroppedImageFile(
                photo.objectUrl,
                photo.croppedAreaPixels,
                photo.file.name,
                photo.file.type || DEFAULT_IMAGE_MIME_TYPE,
              )
            : photo.file,
        ),
      );
      const urls = await uploadsApi.upload(files);
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
  const activePhoto = pending.activePhoto;

  return (
    <Modal
      open={open}
      onClose={close}
      title="New post"
      description="Share a fit and tag the pieces you're wearing."
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
    >
      {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

      <div
        className="-mx-6 -my-5 flex flex-col sm:h-[var(--modal-row-height)] sm:flex-row"
        style={{ "--modal-row-height": `${MODAL_ROW_HEIGHT_PX}px` } as CSSProperties}
      >
        <div className="flex shrink-0 flex-col border-b border-border sm:w-95 sm:border-b-0 sm:border-r">
          {activePhoto ? (
            <CropSurface
              imageSrc={activePhoto.objectUrl}
              aspect={PHOTO_ASPECT}
              crop={activePhoto.crop}
              onCropChange={(crop) => pending.updateActivePhoto({ crop })}
              zoom={activePhoto.zoom}
              onZoomChange={(zoom) => pending.updateActivePhoto({ zoom })}
              onCropComplete={(croppedAreaPixels) =>
                pending.updateActivePhoto({ croppedAreaPixels })
              }
              className="min-h-0 flex-1"
              cropAreaStyle={CROP_BOX_STYLE}
              showGrid
              showZoomSlider={false}
              overlay={
                <>
                  <button
                    type="button"
                    onClick={() => pending.removePhoto(activePhoto.id)}
                    aria-label="Remove photo"
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/70"
                  >
                    <X className="size-3.5" />
                  </button>
                  <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                    {pending.photos.length}/{MAX_PHOTOS} photos
                  </span>
                  {pending.photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => pending.inputRef.current?.click()}
                      aria-label="Add another photo"
                      className="absolute bottom-2.5 right-2.5 flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-105"
                    >
                      <Plus className="size-4.5" />
                    </button>
                  )}
                </>
              }
            />
          ) : (
            <button
              type="button"
              onClick={() => pending.inputRef.current?.click()}
              style={{ aspectRatio: CROP_BOX_STYLE.aspectRatio }}
              className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 bg-muted text-muted-foreground transition-colors hover:text-foreground"
            >
              <ImagePlus className="size-7" />
              <span className="text-sm font-medium">Add a photo</span>
              <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                {pending.photos.length}/{MAX_PHOTOS} photos
              </span>
            </button>
          )}

          <HiddenFileInput inputRef={pending.inputRef} onFilesSelected={pending.handleFileSelect} />

          {(photoError || form.formState.errors.imageUrls) && (
            <p className="px-3 py-2 text-center text-xs text-destructive">
              {photoError ?? form.formState.errors.imageUrls?.message}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <PendingPhotoThumbnailRail
              photos={pending.photos}
              activePhotoId={activePhoto?.id}
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
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => void handlePostLook()}
              disabled={pending.photos.length === 0 || isProcessingPhotos || create.isPending}
            >
              {isProcessingPhotos ? "Processing…" : create.isPending ? "Posting…" : "Post look"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
