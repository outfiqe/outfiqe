"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ImageIcon } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";
import { Input } from "@/design-system/components/ui/input";
import { Modal } from "@/design-system/components/ui/modal";
import { Skeleton } from "@/design-system/components/ui/skeleton";
import { toast } from "@/design-system/components/ui/toast";
import { FormBanner } from "@/components/FormBanner";
import { cn } from "@/shared/lib/cn";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useCreateLook } from "../hooks/useCreateLook";
import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { lookFormSchema, type LookFormInput } from "../schemas/lookForm.schema";

const textareaClass =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground";
const SEARCH_DEBOUNCE_MS = 300;

interface PostModalProps {
  open: boolean;
  onClose: () => void;
}

export function PostModal({ open, onClose }: PostModalProps) {
  const [productFilter, setProductFilter] = useState("");
  const debouncedFilter = useDebouncedValue(productFilter, SEARCH_DEBOUNCE_MS);
  const taggableProducts = useTaggableProducts(debouncedFilter);
  const create = useCreateLook();

  const form = useForm<LookFormInput>({
    resolver: zodResolver(lookFormSchema),
    defaultValues: { imageUrl: "", caption: "", taggedProducts: [] },
  });

  const imageUrl = form.watch("imageUrl");
  const taggedProducts = form.watch("taggedProducts");

  const close = () => {
    form.reset();
    setProductFilter("");
    onClose();
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success("Look posted");
      close();
    } catch {
      // surfaced via create.error below
    }
  });

  const filteredProducts = taggableProducts.data?.products ?? [];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Post a look"
      description="Share a fit and tag the pieces you're wearing."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={create.isPending}>
            {create.isPending ? "Posting…" : "Post look"}
          </Button>
        </div>
      }
    >
      {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div
            className="aspect-[4/5] w-full shrink-0 overflow-hidden rounded-xl border border-border bg-muted bg-cover bg-center sm:w-40"
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
              <label className="mb-1.5 block text-sm font-medium text-foreground">Image URL</label>
              <Input placeholder="https://…" {...form.register("imageUrl")} />
              {form.formState.errors.imageUrl && (
                <p className="mt-1.5 text-xs text-destructive">
                  {form.formState.errors.imageUrl.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Caption (optional)
              </label>
              <textarea
                rows={3}
                placeholder="Layering for Kathmandu winters"
                className={textareaClass}
                {...form.register("caption")}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Tag products <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {taggedProducts.length}/6 selected
            </span>
          </div>
          <Input
            placeholder="Filter products…"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            className="mb-2"
          />
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
            {taggableProducts.isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 rounded-lg" />
              ))}
            {filteredProducts.map((product) => {
              const tag = taggedProducts.find((t) => t.productId === product.id);
              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors",
                    tag ? "border-foreground bg-muted" : "border-transparent hover:bg-muted",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue(
                        "taggedProducts",
                        tag
                          ? taggedProducts.filter((t) => t.productId !== product.id)
                          : [...taggedProducts, { productId: product.id, sizeWorn: "" }],
                        { shouldValidate: true },
                      );
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-foreground">{product.name}</span>
                      <span className="text-muted-foreground"> — {product.brand}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-primary-strong">
                      Rs. {product.price.toLocaleString()}
                    </span>
                  </button>
                  {tag && (
                    <Input
                      placeholder="Size worn (e.g. M)"
                      className="h-8 w-32"
                      value={tag.sizeWorn}
                      onChange={(event) =>
                        form.setValue(
                          "taggedProducts",
                          taggedProducts.map((t) =>
                            t.productId === product.id ? { ...t, sizeWorn: event.target.value } : t,
                          ),
                          { shouldValidate: true },
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
          {form.formState.errors.taggedProducts && (
            <p className="mt-1.5 text-xs text-destructive">
              {form.formState.errors.taggedProducts.message}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
