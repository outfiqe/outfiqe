"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { ImageOff, Search, X } from "lucide-react";
import { useState } from "react";

import type { PublicProduct } from "@/features/products/api/productSchemas";

import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { SEARCH_DEBOUNCE_MS } from "./PostModal.constants";

const ProductThumb = ({ url }: { url: string | null }) => (
  <div
    className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted bg-cover bg-center"
    style={url ? { backgroundImage: `url(${url})` } : undefined}
  >
    {!url && <ImageOff className="size-4 text-muted-foreground" />}
  </div>
);

type ShareProductPickerProps = {
  selectedProduct: PublicProduct | null;
  onSelect: (product: PublicProduct | null) => void;
};

export const ShareProductPicker = ({ selectedProduct, onSelect }: ShareProductPickerProps) => {
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebouncedValue(filter, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedFilter.trim().length > 0;
  const { data, isLoading } = useTaggableProducts(debouncedFilter, isSearching);
  const results = data?.products ?? [];

  if (selectedProduct) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-foreground bg-muted px-2.5 py-2">
        <ProductThumb url={selectedProduct.imageUrl} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {selectedProduct.name}
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="Clear selected product"
          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <Autocomplete>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <AutocompleteInput
          placeholder="Search a product to share…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="pl-9"
        />
      </div>

      {isSearching && (
        <AutocompleteContent className="mt-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2.5 px-1.5 py-1.5">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3 rounded" />
                  <Skeleton className="h-2.5 w-1/3 rounded" />
                </div>
              </div>
            ))}

          {!isLoading && results.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No products found for &ldquo;{debouncedFilter}&rdquo;
            </p>
          )}

          {results.map((product) => (
            <AutocompleteItem
              key={product.id}
              value={product.id}
              onSelect={() => onSelect(product)}
            >
              <ProductThumb url={product.imageUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-foreground">{product.name}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {product.brand}
                </span>
              </span>
              <span className="shrink-0 text-[12.5px] font-semibold text-primary-strong">
                Rs. {product.price.toLocaleString()}
              </span>
            </AutocompleteItem>
          ))}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};
