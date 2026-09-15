import { Badge, Button, Skeleton, toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { productsApi } from "./api";
import { useInfiniteProducts } from "./hooks/useInfiniteProducts";
import type { ProductStatusValue } from "./schemas";

const TABS: ProductStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];
const PRODUCTS_STATUS_FILTER = oneOfFilter<ProductStatusValue>(TABS, "PENDING");

const STATUS_TONE: Record<ProductStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  REJECTED: "negative",
};

export const ProductsPage = () => {
  const [tab, setTab] = useSearchFilter("status", PRODUCTS_STATUS_FILTER);
  const queryClient = useQueryClient();

  const {
    data: productsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteProducts(tab);
  const products = productsQuery?.pages.flatMap((page) => page.products) ?? [];

  const approve = useMutation({
    mutationFn: (id: string) => productsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const reject = useMutation({
    mutationFn: (id: string) => productsApi.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
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
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load products.</p>}
        {!isLoading && products.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {products.map((product) => {
          const { id, imageUrl, name, status, lowStock, brand, price, productType, categories } =
            product;

          return (
            <div
              key={id}
              className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4"
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
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {brand.name} &middot; Rs. {price.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {productType.label} &middot; {categories.join(", ")}
                </p>
              </div>

              {status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => approve.mutate(id)}
                    disabled={approve.isPending || reject.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => reject.mutate(id)}
                    disabled={approve.isPending || reject.isPending}
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
    </div>
  );
};
