import { Badge, Button } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { productsApi } from "./api";
import { useInfiniteProducts } from "./hooks/useInfiniteProducts";
import type { ProductStatusValue } from "./schemas";

const TABS: ProductStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_TONE: Record<ProductStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  REJECTED: "negative",
};

export function ProductsPage() {
  const [tab, setTab] = useState<ProductStatusValue>("PENDING");
  const queryClient = useQueryClient();

  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteProducts(tab);
  const products = data?.pages.flatMap((page) => page.products) ?? [];

  const approve = useMutation({
    mutationFn: (id: string) => productsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => productsApi.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>

      <div className="mt-5 flex gap-2">
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

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load products.</p>}
        {!isLoading && products.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {products.map((product) => (
          <div
            key={product.id}
            className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4"
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt=""
                className="size-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="size-16 shrink-0 rounded-lg bg-muted" />
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">{product.name}</h2>
                <Badge tone={STATUS_TONE[product.status]} showDot={false}>
                  {product.status}
                </Badge>
                {product.lowStock && (
                  <Badge tone="negative" showDot={false}>
                    Low stock
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.brand.name} &middot; Rs. {product.price.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.type} &middot; {product.categories.join(", ")}
              </p>
            </div>

            {product.status === "PENDING" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => approve.mutate(product.id)}
                  disabled={approve.isPending || reject.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => reject.mutate(product.id)}
                  disabled={approve.isPending || reject.isPending}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
}
