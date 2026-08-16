"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteGroup,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { forwardRef, useEffect, useState } from "react";

import { useCitySearch } from "../hooks/useCitySearch";
import { groupCitiesByZone } from "../lib/groupCitiesByZone";

const CITY_SEARCH_DEBOUNCE_MS = 300;

type CityAutocompleteProps = Omit<
  React.ComponentPropsWithoutRef<typeof AutocompleteInput>,
  "value" | "onChange" | "defaultValue" | "placeholder"
> & {
  value: string;
  onChange: (city: string) => void;
};

export const CityAutocomplete = forwardRef<HTMLInputElement, CityAutocompleteProps>(
  ({ value, onChange, onBlur, ...inputProps }, ref) => {
    const [query, setQuery] = useState(value);
    const debouncedQuery = useDebouncedValue(query, CITY_SEARCH_DEBOUNCE_MS);
    const isSearching = debouncedQuery.trim().length > 0;
    const { data: results, isLoading } = useCitySearch(debouncedQuery, isSearching);
    const cities = results ?? [];

    useEffect(() => {
      setQuery(value);
    }, [value]);

    const zoneGroups = groupCitiesByZone(cities);

    const selectCity = (city: string) => {
      setQuery(city);
      onChange(city);
    };

    return (
      <Autocomplete>
        <AutocompleteInput
          {...inputProps}
          ref={ref}
          placeholder="Select your city"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onBlur={(event) => {
            setQuery(value);
            onBlur?.(event);
          }}
        />

        {isSearching && (
          <AutocompleteContent className="mt-2">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="mx-1.5 my-1 h-7 rounded-md" />
              ))}

            {!isLoading && cities.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No cities found for &ldquo;{debouncedQuery}&rdquo;
              </p>
            )}

            {zoneGroups.map((group) => (
              <AutocompleteGroup key={group.zoneId} label={group.zoneName}>
                {group.cities.map((match) => (
                  <AutocompleteItem
                    key={match.city}
                    value={match.city}
                    onSelect={() => selectCity(match.city)}
                  >
                    <span className="truncate text-[13px] text-foreground">{match.city}</span>
                  </AutocompleteItem>
                ))}
              </AutocompleteGroup>
            ))}
          </AutocompleteContent>
        )}
      </Autocomplete>
    );
  },
);
CityAutocomplete.displayName = "CityAutocomplete";
