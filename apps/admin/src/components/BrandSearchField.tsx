import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  cn,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";

import { brandsApi, type BrandSearchResult } from "@/lib/brandsApi";

const BRAND_SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;
const LOADING_ROW_COUNT = 3;

export type SelectedBrand = Pick<BrandSearchResult, "id" | "name">;

type BrandSearchFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: SelectedBrand | null;
  onChange: (brand: BrandSearchResult | null) => void;
  resultNoun?: string;
  clearLabel?: string;
  inputClassName?: string;
};

export const BrandSearchField = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  resultNoun = "brands",
  clearLabel = "Clear selected brand",
  inputClassName,
}: BrandSearchFieldProps) => {
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const query = typedQuery ?? value?.name ?? "";

  const debouncedQuery = useDebouncedValue(query, BRAND_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data: results, isLoading } = useQuery({
    queryKey: ["admin-brand-search", debouncedQuery],
    queryFn: () => brandsApi.search(debouncedQuery.trim()),
    enabled: isSearching,
  });
  const brands = results ?? [];

  const selectBrand = (brandId: string) => {
    const brand = brands.find((candidate) => candidate.id === brandId);
    if (!brand) return;
    setTypedQuery(null);
    onChange(brand);
  };

  const clearBrand = () => {
    setTypedQuery(null);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <Autocomplete>
        <div className="relative">
          <AutocompleteInput
            id={id}
            placeholder={placeholder}
            value={query}
            onChange={(event) => setTypedQuery(event.target.value)}
            onBlur={() => setTypedQuery(null)}
            className={cn("pr-8", inputClassName)}
          />
          {value && (
            <button
              type="button"
              onClick={clearBrand}
              aria-label={clearLabel}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isSearching && (
          <AutocompleteContent className="mt-2">
            {isLoading &&
              Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
                <Skeleton key={index} className="mx-1.5 my-1 h-7 rounded-md" />
              ))}

            {!isLoading && brands.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No {resultNoun} found for &ldquo;{debouncedQuery}&rdquo;
              </p>
            )}

            {brands.map((brand) => (
              <AutocompleteItem
                key={brand.id}
                value={brand.id}
                onSelect={() => selectBrand(brand.id)}
              >
                <span className="truncate text-[13px] text-foreground">{brand.name}</span>
              </AutocompleteItem>
            ))}
          </AutocompleteContent>
        )}
      </Autocomplete>
    </div>
  );
};
