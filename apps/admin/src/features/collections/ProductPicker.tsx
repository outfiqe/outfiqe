import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Input } from "@outfiqe/design-system";
import { collectionsApi } from "./api";
import type { Collection, ProductSearchResult } from "./schemas";

type ProductPickerProps = {
  collection: Collection;
  onClose: () => void;
};

export const ProductPicker = ({ collection, onClose }: ProductPickerProps) => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [known, setKnown] = useState<Map<string, ProductSearchResult>>(new Map());

  const current = useQuery({
    queryKey: ["collection-products", collection.id],
    queryFn: () => collectionsApi.listProducts(collection.id),
  });

  const search = useQuery({
    queryKey: ["product-search", query],
    queryFn: () => collectionsApi.searchProducts(query),
    enabled: query.trim().length > 0,
  });

  useEffect(() => {
    if (!current.data) return;
    setKnown((prev) => new Map([...prev, ...current.data.map((p) => [p.id, p] as const)]));
    setSelectedIds((ids) => ids ?? current.data.map((product) => product.id));
  }, [current.data]);

  useEffect(() => {
    if (!search.data) return;
    setKnown((prev) => new Map([...prev, ...search.data.map((p) => [p.id, p] as const)]));
  }, [search.data]);

  const save = useMutation({
    mutationFn: (productIds: string[]) => collectionsApi.setProducts(collection.id, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-products", collection.id] });
      onClose();
    },
  });

  const selected = selectedIds ?? [];

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
        <Input
          id="product-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name"
          className="mt-1.5"
        />

        <div className="mt-2 space-y-1.5">
          {search.data
            ?.filter((product) => !selected.includes(product.id))
            .map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground">
                  {product.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {product.brand} · Rs. {product.price.toLocaleString()}
                  </span>
                </span>
                <Button variant="outline" onClick={() => add(product.id)}>
                  Add
                </Button>
              </div>
            ))}
        </div>
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
