"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Button,
  Input,
  Skeleton,
} from "@outfiqe/design-system";
import { Check, Clock, ImageOff, Search, Tags, X } from "lucide-react";
import { useState } from "react";

import type { PublicProduct } from "@/features/products/api/productSchemas";
import { AppImage } from "@/shared/components/AppImage";
import { cn } from "@/shared/lib/cn";

import type { EditTaggedProduct } from "../api/creatorLooksSchemas";
import type { LookFormInput } from "../schemas/lookForm.schema";
import {
  TAG_IN_REVIEW_HINT,
  TAG_REJECTION_REASON_LABELS,
  TAG_REVIEW_STATUS_LABELS,
} from "../utils/tagReviewLabels";

const ProductThumb = ({ url, className }: { url: string | null; className?: string }) => (
  <div
    className={cn(
      "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted",
      className,
    )}
  >
    {url ? (
      <AppImage src={url} alt="" fill sizes="64px" />
    ) : (
      <ImageOff className="size-4 text-muted-foreground" />
    )}
  </div>
);

type CachedTagProduct = { name: string; imageUrl: string | null };

type TagReviewState = Pick<
  EditTaggedProduct,
  "reviewStatus" | "rejectionReason" | "rejectionNote" | "canReRequest"
>;

const TagReviewStatusChip = ({
  reviewStatus,
}: {
  reviewStatus: TagReviewState["reviewStatus"];
}) => {
  if (reviewStatus === "APPROVED") return null;
  const isPending = reviewStatus === "PENDING";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        isPending ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800",
      )}
    >
      {isPending && <Clock className="size-3" />}
      {TAG_REVIEW_STATUS_LABELS[reviewStatus]}
    </span>
  );
};

const TagReviewNote = ({
  review,
  productName,
  onReRequest,
}: {
  review: TagReviewState;
  productName: string;
  onReRequest: () => void;
}) => {
  if (review.reviewStatus === "APPROVED") return null;

  if (review.reviewStatus === "PENDING") {
    return <p className="mt-1.5 text-xs text-amber-700">{TAG_IN_REVIEW_HINT}</p>;
  }

  return (
    <div className="mt-1.5 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800">
      <p className="font-medium">
        {review.rejectionReason
          ? TAG_REJECTION_REASON_LABELS[review.rejectionReason]
          : TAG_REJECTION_REASON_LABELS.OTHER}
      </p>
      {review.rejectionNote && <p className="mt-0.5 text-red-700">“{review.rejectionNote}”</p>}
      {review.canReRequest ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReRequest}
          className="mt-1.5 h-7 border-red-300 text-red-800 hover:bg-red-800 hover:text-white"
        >
          Request again
        </Button>
      ) : (
        <p className="mt-1 text-red-700">
          You&apos;ve used all your re-requests for {productName}. Ask the brand to take another
          look.
        </p>
      )}
    </div>
  );
};

type ProductTagPickerProps = {
  taggedProducts: LookFormInput["taggedProducts"];
  maxTaggedProducts: number;
  productCache: Record<string, CachedTagProduct>;
  reviewByProductId?: Record<string, TagReviewState>;
  onToggleProduct: (product: PublicProduct) => void;
  onRemoveTag: (productId: string) => void;
  onSizeChange: (productId: string, sizeWorn: string) => void;
  onReRequestTag?: (productId: string) => void;
  initialExpanded?: boolean;
  sizeErrors?: Record<string, string>;
  productFilter: string;
  onFilterChange: (value: string) => void;
  debouncedFilter: string;
  isSearching: boolean;
  isSearchLoading: boolean;
  searchResults: PublicProduct[];
  error?: string;
};

export const ProductTagPicker = ({
  taggedProducts,
  maxTaggedProducts,
  productCache,
  reviewByProductId,
  onToggleProduct,
  onRemoveTag,
  onSizeChange,
  onReRequestTag,
  initialExpanded = false,
  sizeErrors,
  productFilter,
  onFilterChange,
  debouncedFilter,
  isSearching,
  isSearchLoading,
  searchResults,
  error,
}: ProductTagPickerProps) => {
  const [showPicker, setShowPicker] = useState(initialExpanded);

  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setShowPicker((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Tags className="size-4 text-muted-foreground" />
        {taggedProducts.length > 0
          ? `${taggedProducts.length} product${taggedProducts.length === 1 ? "" : "s"} tagged`
          : "Tag a product"}
      </button>

      {showPicker && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            {taggedProducts.length}/{maxTaggedProducts} selected
          </p>

          {taggedProducts.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {taggedProducts.map((tag) => {
                const product = productCache[tag.productId];
                const sizeError = sizeErrors?.[tag.productId];
                const review = reviewByProductId?.[tag.productId];
                const productName = product?.name ?? "this product";
                return (
                  <div
                    key={tag.productId}
                    className="rounded-lg border border-foreground bg-muted px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <ProductThumb url={product?.imageUrl ?? null} className="size-9" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                        {product?.name ?? "Product"}
                      </span>
                      {review && <TagReviewStatusChip reviewStatus={review.reviewStatus} />}
                      <Input
                        placeholder="Size (e.g. M)"
                        className="h-8 w-24 shrink-0"
                        value={tag.sizeWorn}
                        aria-invalid={sizeError ? true : undefined}
                        aria-label={`Size worn for ${product?.name ?? "product"}`}
                        onChange={(event) => onSizeChange(tag.productId, event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveTag(tag.productId)}
                        aria-label={`Remove ${product?.name ?? "product"} tag`}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    {sizeError && <p className="mt-1 text-xs text-destructive">{sizeError}</p>}
                    {review && (
                      <TagReviewNote
                        review={review}
                        productName={productName}
                        onReRequest={() => onReRequestTag?.(tag.productId)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Autocomplete>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <AutocompleteInput
                placeholder="Search products to tag…"
                value={productFilter}
                onChange={(event) => onFilterChange(event.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {isSearching && (
              <AutocompleteContent className="mt-2">
                {isSearchLoading &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2.5 px-1.5 py-1.5">
                      <Skeleton className="size-9 shrink-0 rounded-md" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-2/3 rounded" />
                        <Skeleton className="h-2.5 w-1/3 rounded" />
                      </div>
                    </div>
                  ))}

                {!isSearchLoading && searchResults.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No products found for &ldquo;{debouncedFilter}&rdquo;
                  </p>
                )}

                {searchResults.map((product) => {
                  const isTagged = taggedProducts.some((tag) => tag.productId === product.id);
                  return (
                    <AutocompleteItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => {
                        onToggleProduct(product);
                        onFilterChange("");
                      }}
                    >
                      <ProductThumb url={product.imageUrl} className="size-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">
                          {product.name}
                        </span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          {product.brand}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12.5px] font-semibold text-primary-strong">
                        Rs. {product.price.toLocaleString()}
                      </span>
                      {isTagged && (
                        <Check className="size-4 shrink-0 text-foreground" aria-label="Tagged" />
                      )}
                    </AutocompleteItem>
                  );
                })}
              </AutocompleteContent>
            )}
          </Autocomplete>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
};
