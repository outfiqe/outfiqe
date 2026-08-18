"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { ImageOff, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { useProductAutocomplete } from "@/features/products/hooks/useProductAutocomplete";
import { cn } from "@/shared/lib/cn";
import { SHOP_SEARCH_PATH } from "@/shared/lib/exploreMode";

import { AUTOCOMPLETE_DEBOUNCE_MS, MIN_QUERY_LENGTH } from "../search.constants";

type ProductSearchBoxProps = {
  placeholder: string;
  formClassName: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
};

export const ProductSearchBox = ({
  placeholder,
  formClassName,
  inputClassName,
  autoFocus,
  onNavigate,
}: ProductSearchBoxProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), AUTOCOMPLETE_DEBOUNCE_MS);
  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data: suggestions, isLoading } = useProductAutocomplete(debouncedQuery, hasQuery);

  const goToSearch = (value: string) => {
    setQuery("");
    onNavigate?.();
    router.push(`${SHOP_SEARCH_PATH}?q=${encodeURIComponent(value)}`);
  };

  const goToProduct = (id: string) => {
    setQuery("");
    onNavigate?.();
    router.push(`/product/${id}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) goToSearch(trimmed);
  };

  return (
    <Autocomplete autoHighlightFirst={false}>
      <form onSubmit={submitSearch} className={formClassName}>
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <AutocompleteInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "h-auto border-0 bg-transparent p-0 text-sm text-foreground shadow-none outline-none focus-visible:border-0",
            inputClassName,
          )}
        />
      </form>

      {hasQuery && (
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

          {!isLoading && suggestions?.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No products found for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {suggestions?.map((product) => (
            <AutocompleteItem
              key={product.id}
              value={product.id}
              onSelect={() => goToProduct(product.id)}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted bg-cover bg-center"
                style={
                  product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined
                }
              >
                {!product.imageUrl && <ImageOff className="size-4 text-muted-foreground" />}
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-foreground">{product.name}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {product.brand}
                </span>
              </span>
            </AutocompleteItem>
          ))}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};
