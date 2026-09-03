"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormBanner, Input, Modal, MultiSelect, toast } from "@outfiqe/design-system";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { useAssignableProductTypes } from "@/features/products/hooks/useProductTypes";
import { useSizeOptions } from "@/features/products/hooks/useSizeOptions";
import { MediaFormShell } from "@/shared/components/MediaFormShell";
import { PendingPhotoThumbnailRail } from "@/shared/components/PendingPhotoThumbnailRail";
import { PhotoCropPane } from "@/shared/components/PhotoCropPane";
import { resolvePendingPhotoUrls, usePendingPhotos } from "@/shared/hooks/usePendingPhotos";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useCreateProduct } from "../hooks/useCreateProduct";
import {
  MAX_IMAGES,
  type ProductFormInput,
  productFormSchema,
} from "../schemas/productForm.schema";
import {
  DEFAULT_IMAGE_MIME_TYPE,
  PRODUCT_CROP_BOX_STYLE,
  PRODUCT_PHOTO_ASPECT,
} from "./ProductModal.constants";
import { SizeStockFields } from "./SizeStockFields";

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground";

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
};

export const ProductModal = ({ open, onClose }: ProductModalProps) => {
  const create = useCreateProduct();
  const productTypes = useAssignableProductTypes();
  const categories = useCategories();
  const pending = usePendingPhotos(MAX_IMAGES);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      type: "",
      categories: [],
      imageUrls: [],
      lowStock: false,
      sizes: [],
    },
  });

  const type = form.watch("type");
  const sizes = form.watch("sizes") ?? [];
  const sizeOptions = useSizeOptions(type);
  const typeField = form.register("type");

  const close = () => {
    form.reset();
    setPhotoError(null);
    pending.reset();
    onClose();
  };

  const submitProduct = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success("Product added");
      close();
    } catch {
      return;
    }
  });

  const handleSubmitProduct = async () => {
    setIsProcessingPhotos(true);
    setPhotoError(null);
    try {
      const urls = await resolvePendingPhotoUrls(pending.photos, DEFAULT_IMAGE_MIME_TYPE);
      form.setValue("imageUrls", urls, { shouldValidate: true });
      await submitProduct();
    } catch (photoUploadError) {
      setPhotoError(getErrorMessage(photoUploadError));
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a product"
      description="New products go live after a quick review."
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
    >
      {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

      <MediaFormShell
        photoAspect={PRODUCT_PHOTO_ASPECT}
        photos={
          <PhotoCropPane
            pending={pending}
            maxPhotos={MAX_IMAGES}
            aspect={PRODUCT_PHOTO_ASPECT}
            cropAreaStyle={PRODUCT_CROP_BOX_STYLE}
            error={photoError}
            emptyLabel="Add a photo (optional)"
          />
        }
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmitProduct()}
              disabled={isProcessingPhotos || create.isPending}
            >
              {isProcessingPhotos
                ? "Processing…"
                : create.isPending
                  ? "Submitting…"
                  : "Submit for review"}
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Product name</label>
          <Input placeholder="Linen band-collar shirt" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="mt-1.5 text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Price (Rs.)</label>
            <Input type="number" min={1} {...form.register("price", { valueAsNumber: true })} />
            {form.formState.errors.price && (
              <p className="mt-1.5 text-xs text-destructive">
                {form.formState.errors.price.message}
              </p>
            )}
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.watch("lowStock") ?? false}
                onChange={(event) => form.setValue("lowStock", event.target.checked)}
              />
              Mark as low stock
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
          <select
            className={selectClass}
            {...typeField}
            onChange={(event) => {
              typeField.onChange(event);
              form.setValue("sizes", []);
            }}
          >
            <option value="" disabled>
              Select a type
            </option>
            {productTypes.data?.map((productType) => (
              <option key={productType.slug} value={productType.slug}>
                {productType.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Sizes and stock
          </label>
          <SizeStockFields
            sizeOptions={sizeOptions.data ?? []}
            value={sizes}
            onChange={(next) => form.setValue("sizes", next, { shouldValidate: true })}
          />
          {form.formState.errors.sizes && (
            <p className="mt-1.5 text-xs text-destructive">{form.formState.errors.sizes.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Categories</label>
          <MultiSelect
            options={
              categories.data?.map((category) => ({
                value: category.slug,
                label: category.name,
              })) ?? []
            }
            value={form.watch("categories") ?? []}
            onChange={(next) => form.setValue("categories", next, { shouldValidate: true })}
            placeholder="Add a category"
          />
          {form.formState.errors.categories && (
            <p className="mt-1.5 text-xs text-destructive">
              {form.formState.errors.categories.message}
            </p>
          )}
        </div>
      </MediaFormShell>
    </Modal>
  );
};
