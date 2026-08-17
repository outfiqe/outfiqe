import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Button,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { collectionsApi } from "./api";
import type { Collection, ProductSearchResult } from "./schemas";

const PRODUCT_SEARCH_DEBOUNCE_MS = 300;

type ProductPickerProps = {
  collection: Collection;
  onClose: () => void;
};

export const ProductPicker = ({ collection, onClose }: ProductPickerProps) => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, PRODUCT_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length > 0;
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [known, setKnown] = useState<Map<string, ProductSearchResult>>(new Map());
  const [processedCurrentData, setProcessedCurrentData] = useState<ProductSearchResult[]>();
  const [processedSearchData, setProcessedSearchData] = useState<ProductSearchResult[]>();

  const current = useQuery({
    queryKey: ["collection-products", collection.id],
    queryFn: () => collectionsApi.listProducts(collection.id),
  });

  const search = useQuery({
    queryKey: ["product-search", debouncedQuery],
    queryFn: () => collectionsApi.searchProducts(debouncedQuery),
    enabled: isSearching,
  });

  if (current.data && current.data !== processedCurrentData) {
    setProcessedCurrentData(current.data);
    setKnown((prev) => new Map([...prev, ...current.data.map((p) => [p.id, p] as const)]));
    setSelectedIds((ids) => ids ?? current.data.map((product) => product.id));
  }

  if (search.data && search.data !== processedSearchData) {
    setProcessedSearchData(search.data);
    setKnown((prev) => new Map([...prev, ...search.data.map((p) => [p.id, p] as const)]));
  }

  const save = useMutation({
    mutationFn: (productIds: string[]) => collectionsApi.setProducts(collection.id, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-products", collection.id] });
      onClose();
    },
  });

  const selected = selectedIds ?? [];
  const availableResults = search.data?.filter((product) => !selected.includes(product.id)) ?? [];

  const add = (productId: string) => {
    setSelectedIds((ids) => (ids?.includes(productId) ? ids : [...(ids ?? []), productId]));
  };

  const remove = (productId: string) => {
    setSelectedIds((ids) => (ids ?? []).filter((id) => id !== productId));
  };

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-border bg-background p-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          In this collection ({selected.length})
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.length === 0 && (
            <p className="text-sm text-muted-foreground">No products added yet.</p>
          )}
          {selected.map((id) => {
            const product = known.get(id);
            return (
              <span
                key={id}
                className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-foreground"
              >
                {product ? `${product.name} · Rs. ${product.price.toLocaleString()}` : id}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`Remove ${product?.name ?? "product"}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="product-search" className="text-xs text-muted-foreground">
          Search products to add
        </label>
        <Autocomplete closeOnSelect={false}>
          <AutocompleteInput
            id="product-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name"
            className="mt-1.5"
          />

          {isSearching && (
            <AutocompleteContent className="mt-2">
              {search.isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 rounded-md" />
                ))}

              {!search.isLoading && availableResults.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No products found for &ldquo;{debouncedQuery}&rdquo;
                </p>
              )}

              {availableResults.map((product) => (
                <AutocompleteItem
                  key={product.id}
                  value={product.id}
                  onSelect={() => add(product.id)}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {product.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {product.brand} · Rs. {product.price.toLocaleString()}
                    </span>
                  </span>
                </AutocompleteItem>
              ))}
            </AutocompleteContent>
          )}
        </Autocomplete>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => save.mutate(selected)} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save products"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
