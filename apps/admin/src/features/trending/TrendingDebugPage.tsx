import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Badge,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { trendingApi } from "./api";
import type { TrendDebugSubject } from "./schemas";
import { TopTrendingList } from "./TopTrendingList";
import { TrendDebugResult } from "./TrendDebugResult";

const PRODUCT_SEARCH_DEBOUNCE_MS = 300;

export const TrendingDebugPage = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TrendDebugSubject | null>(null);
  const debouncedQuery = useDebouncedValue(query, PRODUCT_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length > 0;

  const search = useQuery({
    queryKey: ["trend-debug-product-search", debouncedQuery],
    queryFn: () => trendingApi.searchProducts(debouncedQuery),
    enabled: isSearching,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Trending debug</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        See what&apos;s trending right now, or look up any approved product to see exactly why it
        is, or isn&apos;t, trending.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div>
          <label htmlFor="trend-debug-search" className="text-xs text-muted-foreground">
            Search for a specific product
          </label>
          <Autocomplete>
            <AutocompleteInput
              id="trend-debug-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Search by product name"
              className="mt-1.5"
            />

            {isSearching && (
              <AutocompleteContent className="mt-2">
                {search.isLoading &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 rounded-md" />
                  ))}

                {!search.isLoading && (search.data ?? []).length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No products found for &ldquo;{debouncedQuery}&rdquo;
                  </p>
                )}

                {(search.data ?? []).map((product) => (
                  <AutocompleteItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => {
                      setSelected({ id: product.id, name: product.name, brand: product.brand });
                      setQuery(product.name);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {product.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {product.brand} &middot; Rs. {product.price.toLocaleString()}
                      </span>
                    </span>
                  </AutocompleteItem>
                ))}
              </AutocompleteContent>
            )}
          </Autocomplete>

          <h2 className="mt-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Top trending right now
          </h2>
          <TopTrendingList
            selectedId={selected?.id ?? null}
            onSelect={(entry) => {
              setSelected({ id: entry.productId, name: entry.name, brand: entry.brand });
              setQuery("");
            }}
          />
        </div>

        <div>
          {selected ? (
            <>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-foreground">{selected.name}</h2>
                <Badge tone="neutral" showDot={false}>
                  {selected.brand}
                </Badge>
              </div>
              <TrendDebugResult product={selected} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pick a product from the trending list or search results to see its breakdown.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
