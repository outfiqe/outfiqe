"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, Input, Modal, ImageUploader, toast, FormBanner } from "@outfiqe/design-system";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { useCreateProduct } from "../hooks/useCreateProduct";
import { productFormSchema, type ProductFormInput } from "../schemas/productForm.schema";

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground";

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
};

export const ProductModal = ({ open, onClose }: ProductModalProps) => {
  const create = useCreateProduct();
  const productTypes = useProductTypes();
  const categories = useCategories();

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      type: "tops",
      category: "formal",
      imageUrls: [],
      lowStock: false,
    },
  });

  const imageUrls = form.watch("imageUrls") ?? [];

  const close = () => {
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success("Product added");
      close();
    } catch {
      // surfaced via create.error below
    }
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a product"
      description="New products go live after a quick review."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={create.isPending}>
            {create.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      }
    >
      {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Photos (optional)
          </label>
          <ImageUploader
            value={imageUrls}
            onChange={(urls) => form.setValue("imageUrls", urls, { shouldValidate: true })}
            onUpload={uploadsApi.upload}
          />
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
            <select className={selectClass} {...form.register("type")}>
              {productTypes.data?.map((productType) => (
                <option key={productType.slug} value={productType.slug}>
                  {productType.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
            <select className={selectClass} {...form.register("category")}>
              {categories.data?.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
};
