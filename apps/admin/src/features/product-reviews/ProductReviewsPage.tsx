import { Badge, Button, Input, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Search, Star, X } from "lucide-react";
import { useState } from "react";

import { productReviewsApi } from "./api";
import type { ProductSuggestion } from "./schemas";

const SEARCH_DEBOUNCE_MS = 300;

type SelectedProductBannerProps = {
  product: ProductSuggestion;
  onChangeProduct: () => void;
};

const SelectedProductBanner = ({ product, onChangeProduct }: SelectedProductBannerProps) => {
  const { imageUrl, name, brand } = product;

  return (
    <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted bg-cover bg-center"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      >
        {!imageUrl && <ImageOff className="size-4 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{brand}</p>
      </div>
      <Button variant="outline" onClick={onChangeProduct}>
        <X className="size-4" />
        Change product
      </Button>
    </div>
  );
};

export const ProductReviewsPage = () => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [selectedProduct, setSelectedProduct] = useState<ProductSuggestion | null>(null);

  const { data: suggestions, isLoading: isSearching } = useQuery({
    queryKey: ["admin-product-search", debouncedQuery],
    queryFn: () => productReviewsApi.searchProducts(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0 && !selectedProduct,
  });

  const reviewsQueryKey = ["admin-product-reviews", selectedProduct?.id] as const;
  const { data: reviewPage, isLoading: isLoadingReviews } = useQuery({
    queryKey: reviewsQueryKey,
    queryFn: () => productReviewsApi.list(selectedProduct?.id ?? ""),
    enabled: selectedProduct !== null,
  });

  const removeReview = useMutation({
    mutationFn: (reviewId: string) => productReviewsApi.remove(selectedProduct?.id ?? "", reviewId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewsQueryKey }),
  });

  const clearSelection = () => {
    setSelectedProduct(null);
    setQuery("");
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Product Reviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Search a product to view and moderate its customer reviews.
      </p>

      {selectedProduct ? (
        <SelectedProductBanner product={selectedProduct} onChangeProduct={clearSelection} />
      ) : (
        <div className="mt-5 space-y-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products by name…"
              className="pl-9"
            />
          </div>

          {debouncedQuery.trim().length > 0 && (
            <div className="max-w-md space-y-2">
              {isSearching && <Skeleton className="h-10 w-full rounded-lg" />}
              {!isSearching && suggestions?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No products found for &ldquo;{debouncedQuery}&rdquo;
                </p>
              )}
              {suggestions?.map((product) => {
                const { id, imageUrl, name, brand } = product;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-foreground"
                  >
                    <div
                      className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted bg-cover bg-center"
                      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
                    >
                      {!imageUrl && <ImageOff className="size-3.5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{brand}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedProduct && (
        <div className="mt-6 space-y-3">
          {isLoadingReviews && (
            <div className="space-y-2" role="status" aria-label="Loading reviews">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          )}

          {!isLoadingReviews && reviewPage?.reviews.length === 0 && (
            <p className="text-sm text-muted-foreground">This product has no reviews yet.</p>
          )}

          {reviewPage?.reviews.map((review) => {
            const { id, author, rating, title, body } = review;

            return (
              <div key={id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{author.name}</span>
                      <Badge tone="neutral" showDot={false}>
                        <Star className="size-3 fill-current" />
                        {rating}
                      </Badge>
                    </div>
                    {title && <p className="mt-1 text-sm font-medium text-foreground">{title}</p>}
                    <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => removeReview.mutate(id)}
                    disabled={removeReview.isPending}
                    className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
