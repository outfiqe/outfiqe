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

import { gamificationApi } from "../api";

const BRAND_SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

type BrandSponsorFieldProps = {
  idPrefix: string;
  sponsorBrandId: string | null;
  sponsorBrandName: string;
  onChange: (brand: { id: string; name: string } | null) => void;
};

export const BrandSponsorField = ({
  idPrefix,
  sponsorBrandId,
  sponsorBrandName,
  onChange,
}: BrandSponsorFieldProps) => {
  const [query, setQuery] = useState(sponsorBrandName);

  const [syncedName, setSyncedName] = useState(sponsorBrandName);
  if (sponsorBrandName !== syncedName) {
    setSyncedName(sponsorBrandName);
    setQuery(sponsorBrandName);
  }

  const debouncedQuery = useDebouncedValue(query, BRAND_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data: results, isLoading } = useQuery({
    queryKey: ["admin-sponsor-brand-search", debouncedQuery],
    queryFn: () => gamificationApi.searchBrands(debouncedQuery.trim()),
    enabled: isSearching,
  });
  const brands = results ?? [];

  const selectBrand = (brandId: string) => {
    const brand = brands.find((candidate) => candidate.id === brandId);
    if (!brand) return;
    setQuery(brand.name);
    onChange(brand);
  };

  const clearSponsor = () => {
    setQuery("");
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-sponsor-brand`} className="block text-xs text-muted-foreground">
        Sponsor brand (optional)
      </label>
      <Autocomplete>
        <div className="relative">
          <AutocompleteInput
            id={`${idPrefix}-sponsor-brand`}
            placeholder="Search brands to credit…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery(sponsorBrandId ? syncedName : "")}
            className="pr-8"
          />
          {sponsorBrandId && (
            <button
              type="button"
              onClick={clearSponsor}
              aria-label="Clear sponsor brand"
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
                No brands found for &ldquo;{debouncedQuery}&rdquo;
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
