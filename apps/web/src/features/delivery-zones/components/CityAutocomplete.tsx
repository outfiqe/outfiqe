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
import { forwardRef, useState } from "react";

import { useCitySearch } from "../hooks/useCitySearch";
import { groupCitiesByZone } from "../utils/groupCitiesByZone";
import { normalizeCityName } from "../utils/resolveZonePreview";

const CITY_SEARCH_DEBOUNCE_MS = 300;
const MIN_TYPED_CITY_LENGTH = 2;
const TYPED_CITY_OPTION_PREFIX = "typed-city:";

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

    const [syncedValue, setSyncedValue] = useState(value);
    if (value !== syncedValue) {
      setSyncedValue(value);
      setQuery(value);
    }

    const debouncedQuery = useDebouncedValue(query, CITY_SEARCH_DEBOUNCE_MS);
    const isSearching = debouncedQuery.trim().length > 0;
    const { data: results, isLoading } = useCitySearch(debouncedQuery, isSearching);
    const cities = results ?? [];

    const zoneGroups = groupCitiesByZone(cities);

    const typedCity = debouncedQuery.trim();
    const hasExactMatch = cities.some(
      (match) => normalizeCityName(match.city) === normalizeCityName(typedCity),
    );
    const canUseTypedCity =
      isSearching && !isLoading && !hasExactMatch && typedCity.length >= MIN_TYPED_CITY_LENGTH;

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

            {!isLoading && cities.length === 0 && !canUseTypedCity && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                Keep typing your city
              </p>
            )}

            {canUseTypedCity && (
              <AutocompleteGroup label="Not in the list">
                <AutocompleteItem
                  value={`${TYPED_CITY_OPTION_PREFIX}${typedCity}`}
                  onSelect={() => selectCity(typedCity)}
                >
                  <span className="truncate text-[13px] text-foreground">
                    Use &ldquo;{typedCity}&rdquo;
                  </span>
                </AutocompleteItem>
              </AutocompleteGroup>
            )}
          </AutocompleteContent>
        )}
      </Autocomplete>
    );
  },
);
CityAutocomplete.displayName = "CityAutocomplete";
