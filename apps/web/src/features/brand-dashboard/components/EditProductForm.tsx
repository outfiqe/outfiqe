"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormBanner, Input, MultiSelect, toast } from "@outfiqe/design-system";
import type { ProductTypeSlug } from "@outfiqe/utils";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { useSizeOptions } from "@/features/products/hooks/useSizeOptions";
import { MediaFormShell } from "@/shared/components/MediaFormShell";
import { PendingPhotoThumbnailRail } from "@/shared/components/PendingPhotoThumbnailRail";
import { PhotoCropPane } from "@/shared/components/PhotoCropPane";
import { resolvePendingPhotoUrls, usePendingPhotos } from "@/shared/hooks/usePendingPhotos";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { useUpdateProduct } from "../hooks/useUpdateProduct";
import {
  buildEditProductFormSchema,
  type EditProductFormInput,
  MAX_IMAGES,
} from "../schemas/productForm.schema";
import {
  DEFAULT_IMAGE_MIME_TYPE,
  PRODUCT_CROP_BOX_STYLE,
  PRODUCT_PHOTO_ASPECT,
} from "./ProductModal.constants";
import { SizeStockFields } from "./SizeStockFields";

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground";

type EditProductFormProps = {
  product: BrandProduct;
  onClose: () => void;
};

export const EditProductForm = ({ product, onClose }: EditProductFormProps) => {
  const originalType = product.type as ProductTypeSlug;
  const update = useUpdateProduct();
  const productTypes = useProductTypes();
  const categories = useCategories();
  const pending = usePendingPhotos(MAX_IMAGES, product.imageUrls);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const form = useForm<EditProductFormInput>({
    resolver: zodResolver(buildEditProductFormSchema(originalType)),
    defaultValues: {
      name: product.name,
      price: product.price,
      type: originalType,
      categories: product.categorySlugs,
      imageUrls: product.imageUrls,
      lowStock: product.lowStock,
      sizes: [],
    },
  });

  const type = form.watch("type");
  const sizes = form.watch("sizes") ?? [];
  const typeChanged = type !== originalType;
  const sizeOptions = useSizeOptions(type);
  const typeField = form.register("type");

  const submitEdit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        productId: product.id,
        input: { ...values, sizes: typeChanged ? values.sizes : undefined },
      });
      toast.success("Product updated");
      onClose();
    } catch {
      return;
    }
  });

  const handleSaveChanges = async () => {
    setIsProcessingPhotos(true);
    setPhotoError(null);
    try {
      const imageUrls = await resolvePendingPhotoUrls(pending.photos, DEFAULT_IMAGE_MIME_TYPE);
      form.setValue("imageUrls", imageUrls, { shouldValidate: true });
      await submitEdit();
    } catch (photoUploadError) {
      setPhotoError(getErrorMessage(photoUploadError));
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const isSaving = isProcessingPhotos || update.isPending;

  return (
    <>
      {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}

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
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveChanges()} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
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
          <select className={selectClass} {...typeField}>
            {productTypes.data?.map((productType) => (
              <option key={productType.slug} value={productType.slug}>
                {productType.label}
              </option>
            ))}
          </select>
          {typeChanged && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Changing type retires this product&apos;s current sizes — pick new ones for the new
              type below. Sizes that already have orders can&apos;t be removed; you&apos;ll need to
              undo the type change if that happens.
            </p>
          )}
        </div>

        {typeChanged && (
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
              <p className="mt-1.5 text-xs text-destructive">
                {form.formState.errors.sizes.message}
              </p>
            )}
          </div>
        )}

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
    </>
  );
};
