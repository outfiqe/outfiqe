import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";

import { brandsApi, type BrandSearchResult } from "@/lib/brandsApi";

const BRAND_SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

type BusinessOwnerFieldProps = {
  selectedBrandId: string | null;
  selectedBrandName: string;
  onSelect: (brand: BrandSearchResult | null) => void;
};

export const BusinessOwnerField = ({
  selectedBrandId,
  selectedBrandName,
  onSelect,
}: BusinessOwnerFieldProps) => {
  const [query, setQuery] = useState(selectedBrandName);

  const [syncedName, setSyncedName] = useState(selectedBrandName);
  if (selectedBrandName !== syncedName) {
    setSyncedName(selectedBrandName);
    setQuery(selectedBrandName);
  }

  const debouncedQuery = useDebouncedValue(query, BRAND_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data: results, isLoading } = useQuery({
    queryKey: ["organizations-business-search", debouncedQuery],
    queryFn: () => brandsApi.search(debouncedQuery.trim()),
    enabled: isSearching,
  });
  const brands = results ?? [];

  const selectBrand = (brandId: string) => {
    const brand = brands.find((candidate) => candidate.id === brandId);
    if (!brand) return;
    setQuery(brand.name);
    onSelect(brand);
  };

  const clearSelection = () => {
    setQuery("");
    onSelect(null);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="organization-owner-brand" className="text-xs text-muted-foreground">
        Business
      </label>
      <Autocomplete>
        <div className="relative">
          <AutocompleteInput
            id="organization-owner-brand"
            placeholder="Search businesses already on Outfiqe…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery(selectedBrandId ? syncedName : "")}
            className="w-64 pr-8"
          />
          {selectedBrandId && (
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear selected business"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isSearching && (
          <AutocompleteContent className="mt-2">
            {isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="mx-1.5 my-1 h-7 rounded-md" />
              ))}

            {!isLoading && brands.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No businesses found for &ldquo;{debouncedQuery}&rdquo;
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
