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

const CITY_SEARCH_DEBOUNCE_MS = 300;
const SKELETON_ROW_COUNT = 4;

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
    const {
      data: results,
      isLoading: isFetchingCities,
      isError: hasSearchFailed,
    } = useCitySearch(debouncedQuery, isSearching);
    const cities = results ?? [];

    const zoneGroups = groupCitiesByZone(cities);

    const isWaitingForResults = isFetchingCities || query.trim() !== debouncedQuery.trim();
    const hasNoDeliverableMatch = !isWaitingForResults && !hasSearchFailed && cities.length === 0;

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
            {isWaitingForResults &&
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
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

            {hasSearchFailed && !isWaitingForResults && (
              <p role="alert" className="px-2 py-4 text-center text-xs text-muted-foreground">
                We couldn&apos;t load cities right now. Please try again
              </p>
            )}

            {hasNoDeliverableMatch && (
              <p role="status" className="px-2 py-4 text-center text-xs text-muted-foreground">
                We don&apos;t deliver to this area yet
              </p>
            )}
          </AutocompleteContent>
        )}
      </Autocomplete>
    );
  },
);
CityAutocomplete.displayName = "CityAutocomplete";
