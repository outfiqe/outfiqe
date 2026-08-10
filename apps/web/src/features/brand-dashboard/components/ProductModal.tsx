"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ImageIcon } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";
import { Input } from "@/design-system/components/ui/input";
import { Modal } from "@/design-system/components/ui/modal";
import { toast } from "@/design-system/components/ui/toast";
import { FormBanner } from "@/components/FormBanner";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { useCreateProduct } from "../hooks/useCreateProduct";
import {
  PRODUCT_TYPE_LABEL,
  PRODUCT_TYPE_VALUES,
  TASTE_CATEGORY_LABEL,
  TASTE_CATEGORY_VALUES,
  productFormSchema,
  type ProductFormInput,
} from "../schemas/productForm.schema";

const selectClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground";

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProductModal({ open, onClose }: ProductModalProps) {
  const create = useCreateProduct();

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      type: "tops",
      category: "formal",
      imageUrl: "",
      lowStock: false,
    },
  });

  const imageUrl = form.watch("imageUrl");

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
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div
            className="aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-border bg-muted bg-cover bg-center sm:w-40"
            style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
          >
            {!imageUrl && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageIcon className="size-6" />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Product name
              </label>
              <Input placeholder="Linen band-collar shirt" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="mt-1.5 text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Image URL (optional)
              </label>
              <Input placeholder="https://…" {...form.register("imageUrl")} />
              {form.formState.errors.imageUrl && (
                <p className="mt-1.5 text-xs text-destructive">
                  {form.formState.errors.imageUrl.message}
                </p>
              )}
            </div>
          </div>
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
              {PRODUCT_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {PRODUCT_TYPE_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
            <select className={selectClass} {...form.register("category")}>
              {TASTE_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {TASTE_CATEGORY_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
