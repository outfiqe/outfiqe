"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  CropSurface,
  FormBanner,
  getCroppedImageFile,
  HiddenFileInput,
  type PixelCrop,
  toast,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { ImagePlus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import type { PublicProduct } from "@/features/products/api/productSchemas";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { isHeicImage, toUploadableImage } from "@/shared/lib/heicImage";

import type { CreatorLookEditDetail } from "../api/creatorLooksSchemas";
import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { useUpdateLook } from "../hooks/useUpdateLook";
import { type EditLookFormInput, editLookFormSchema } from "../schemas/lookForm.schema";
import {
  collectTaggedProductSizeErrors,
  summarizeTaggedProductErrors,
} from "../utils/taggedProductSizeErrors";
import {
  CROP_BOX_STYLE,
  DEFAULT_IMAGE_MIME_TYPE,
  MAX_PHOTOS,
  MAX_TAGGED_PRODUCTS,
  PHOTO_ASPECT,
  SEARCH_DEBOUNCE_MS,
} from "./PostModal.constants";
import { ProductTagPicker } from "./ProductTagPicker";

type NewLookPhoto = {
  id: string;
  file: File;
  objectUrl: string;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: PixelCrop | null;
};

const createPhotoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

type EditPostFormProps = {
  lookId: string;
  detail: CreatorLookEditDetail;
  onClose: () => void;
};

export const EditPostForm = ({ lookId, detail, onClose }: EditPostFormProps) => {
  const update = useUpdateLook();

  const [existingUrls, setExistingUrls] = useState(detail.imageUrls);
  const [newPhotos, setNewPhotos] = useState<NewLookPhoto[]>([]);
  const [stagingPhoto, setStagingPhoto] = useState<NewLookPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const totalPhotoCount = existingUrls.length + newPhotos.length + (stagingPhoto ? 1 : 0);
  const canAddPhoto = totalPhotoCount < MAX_PHOTOS;

  const revokeNewPhoto = (photo: NewLookPhoto) => URL.revokeObjectURL(photo.objectUrl);

  const close = () => {
    newPhotos.forEach(revokeNewPhoto);
    if (stagingPhoto) revokeNewPhoto(stagingPhoto);
    onClose();
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    const selected = fileList?.item(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!selected || !canAddPhoto) return;

    setPhotoError(null);

    let photoFile = selected;
    if (isHeicImage(selected)) {
      setIsProcessingPhotos(true);
      try {
        photoFile = await toUploadableImage(selected);
      } catch (conversionFailure) {
        setPhotoError(getErrorMessage(conversionFailure));
        return;
      } finally {
        setIsProcessingPhotos(false);
      }
    }

    setStagingPhoto({
      id: createPhotoId(),
      file: photoFile,
      objectUrl: URL.createObjectURL(photoFile),
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
    });
  };

  const confirmStagingPhoto = () => {
    if (!stagingPhoto) return;
    setNewPhotos((current) => [...current, stagingPhoto]);
    setStagingPhoto(null);
  };

  const cancelStagingPhoto = () => {
    if (stagingPhoto) revokeNewPhoto(stagingPhoto);
    setStagingPhoto(null);
  };

  const removeExistingPhoto = (url: string) => {
    setExistingUrls((current) => current.filter((existingUrl) => existingUrl !== url));
  };

  const removeNewPhoto = (id: string) => {
    setNewPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) revokeNewPhoto(target);
      return current.filter((photo) => photo.id !== id);
    });
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
      if (newPhotos.length > 0) {
        const files = await Promise.all(
          newPhotos.map((photo) =>
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
        uploadedNewUrls = await uploadsApi.upload(files);
      }

      await update.mutateAsync({
        lookId,
        input: { ...values, imageUrls: [...existingUrls, ...uploadedNewUrls] },
      });
      toast.success("Post updated");
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
        <div>
          <div className="flex flex-wrap gap-2">
            {existingUrls.map((url) => (
              <div key={url} className="group relative size-20 shrink-0">
                <div
                  className="size-full overflow-hidden rounded-xl bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${url})` }}
                />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(url)}
                  aria-label="Remove photo"
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {newPhotos.map((photo) => (
              <div key={photo.id} className="group relative size-20 shrink-0">
                <div
                  className="size-full overflow-hidden rounded-xl bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.objectUrl})` }}
                />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(photo.id)}
                  aria-label="Remove photo"
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {canAddPhoto && !stagingPhoto && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add a photo"
                className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:text-foreground"
              >
                <ImagePlus className="size-5" />
                <span className="text-[11px] font-medium">Add</span>
              </button>
            )}
          </div>

          <HiddenFileInput inputRef={fileInputRef} onFilesSelected={handleFilesSelected} />

          <p className="mt-1.5 text-xs text-muted-foreground">
            {existingUrls.length + newPhotos.length}/{MAX_PHOTOS} photos
          </p>

          {photoError && <p className="mt-1.5 text-xs text-destructive">{photoError}</p>}
        </div>

        {stagingPhoto && (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <CropSurface
              imageSrc={stagingPhoto.objectUrl}
              aspect={PHOTO_ASPECT}
              crop={stagingPhoto.crop}
              onCropChange={(crop) =>
                setStagingPhoto((current) => (current ? { ...current, crop } : current))
              }
              zoom={stagingPhoto.zoom}
              onZoomChange={(zoom) =>
                setStagingPhoto((current) => (current ? { ...current, zoom } : current))
              }
              onCropComplete={(croppedAreaPixels) =>
                setStagingPhoto((current) =>
                  current ? { ...current, croppedAreaPixels } : current,
                )
              }
              cropAreaClassName="h-56"
              cropAreaStyle={CROP_BOX_STYLE}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={cancelStagingPhoto}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmStagingPhoto}>
                Use photo
              </Button>
            </div>
          </div>
        )}

        <textarea
          rows={4}
          placeholder="Write your caption here…."
          className="w-full resize-none rounded-lg border border-border bg-transparent p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          {...form.register("caption")}
        />

        <ProductTagPicker
          taggedProducts={taggedProducts}
          maxTaggedProducts={MAX_TAGGED_PRODUCTS}
          productCache={productCache}
          onToggleProduct={toggleProduct}
          onRemoveTag={removeTag}
          onSizeChange={setSizeWorn}
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
        <Button onClick={() => void submitEdit()} disabled={isSaving || Boolean(stagingPhoto)}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </>
  );
};
