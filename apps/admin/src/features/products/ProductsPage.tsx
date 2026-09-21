import { Badge, Button, Skeleton, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { THRIFT_CONDITION_LABEL } from "@outfiqe/utils";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { productsApi } from "./api";
import { useInfiniteProducts } from "./hooks/useInfiniteProducts";
import { ProductDetailModal } from "./ProductDetailModal";
import type { ProductStatusValue } from "./schemas";

const TABS: ProductStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];
const PRODUCTS_STATUS_FILTER = oneOfFilter<ProductStatusValue>(TABS, "PENDING");
const THRIFT_FILTER_VALUES = ["all", "true"] as const;
type ThriftFilterValue = (typeof THRIFT_FILTER_VALUES)[number];
const PRODUCTS_THRIFT_FILTER = oneOfFilter<ThriftFilterValue>(THRIFT_FILTER_VALUES, "all");

const STATUS_TONE: Record<ProductStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  REJECTED: "negative",
};

const PRODUCT_ROW_SKELETON_COUNT = 6;
const PRODUCT_ROW_CLASS =
  "flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4";

const ProductRowSkeleton = () => (
  <div className={PRODUCT_ROW_CLASS} aria-hidden>
    <Skeleton className="size-16 shrink-0 rounded-lg" />
    <div className="flex-1">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-1 h-5 w-40" />
      <Skeleton className="mt-1 h-5 w-56" />
    </div>
  </div>
);

export const ProductsPage = () => {
  const [tab, setTab] = useSearchFilter("status", PRODUCTS_STATUS_FILTER);
  const [thriftFilter, setThriftFilter] = useSearchFilter("thrift", PRODUCTS_THRIFT_FILTER);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  const {
    data: productsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteProducts(tab, thriftFilter === "true" ? true : undefined);
  const products = productsQuery?.pages.flatMap((page) => page.products) ?? [];
  const detailProduct = detailProductId
    ? (products.find((product) => product.id === detailProductId) ?? null)
    : null;

  const approve = useApiMutation({
    successMessage: "Product approved.",
    mutationFn: (id: string) => productsApi.approve(id),
    invalidateKeys: [["products"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const reject = useApiMutation({
    successMessage: "Product rejected.",
    mutationFn: (id: string) => productsApi.reject(id),
    invalidateKeys: [["products"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((status) => (
            <button
              key={status}
              onClick={() => setTab(status)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === status
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {status[0]}
              {status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <button
          onClick={() => setThriftFilter(thriftFilter === "true" ? "all" : "true")}
          aria-pressed={thriftFilter === "true"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            thriftFilter === "true"
              ? "bg-thrift text-thrift-foreground"
              : "border border-border text-muted-foreground hover:text-thrift-strong"
          }`}
        >
          Thrift
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: PRODUCT_ROW_SKELETON_COUNT }, (_unused, rowIndex) => (
            <ProductRowSkeleton key={rowIndex} />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load products.</p>}
        {!isLoading && products.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {products.map((product) => {
          const {
            id,
            imageUrl,
            name,
            status,
            lowStock,
            brand,
            price,
            productType,
            categories,
            isThrift,
            thriftConditionRating,
            thriftConditionNotes,
          } = product;

          return (
            <div key={id} className={PRODUCT_ROW_CLASS}>
              <button
                type="button"
                onClick={() => setDetailProductId(id)}
                aria-label={`View ${name}`}
                className="flex flex-1 items-start gap-4 text-left"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="size-16 shrink-0 rounded-lg bg-muted" />
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-foreground">{name}</h2>
                    <Badge tone={STATUS_TONE[status]} showDot={false}>
                      {status}
                    </Badge>
                    {lowStock && (
                      <Badge tone="negative" showDot={false}>
                        Low stock
                      </Badge>
                    )}
                    {isThrift && (
                      <span className="rounded-full bg-thrift/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-thrift-strong">
                        Thrift
                        {thriftConditionRating &&
                          ` · ${THRIFT_CONDITION_LABEL[thriftConditionRating]}`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {brand.name} &middot; Rs. {price.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {productType.label} &middot; {categories.join(", ")}
                  </p>
                  {isThrift && thriftConditionNotes && (
                    <p className="mt-1.5 text-sm text-foreground">
                      <span className="font-medium">Condition notes:</span> {thriftConditionNotes}
                    </p>
                  )}
                </div>
              </button>

              {status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => approve.mutate(id)}
                    disabled={approve.isPending || reject.isPending}
                    isLoading={approve.isPending && approve.variables === id}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => reject.mutate(id)}
                    disabled={approve.isPending || reject.isPending}
                    isLoading={reject.isPending && reject.variables === id}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
            className="mx-auto"
          >
            Load more
          </Button>
        )}
      </div>

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProductId(null)}
          onApprove={() => approve.mutate(detailProduct.id)}
          onReject={() => reject.mutate(detailProduct.id)}
          isMutating={approve.isPending || reject.isPending}
        />
      )}
    </div>
  );
};
