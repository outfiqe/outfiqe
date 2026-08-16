"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteGroup,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { forwardRef, useEffect, useState } from "react";

import { useDeliveryZones } from "../hooks/useDeliveryZones";
import { normalizeCityName } from "../lib/resolveZonePreview";

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
    const deliveryZonesQuery = useDeliveryZones();
    const zones = deliveryZonesQuery.data ?? [];

    useEffect(() => {
      setQuery(value);
    }, [value]);

    const normalizedQuery = normalizeCityName(query);
    const visibleZones = zones
      .map((zone) => ({
        ...zone,
        cities: zone.cities.filter((city) => normalizeCityName(city).includes(normalizedQuery)),
      }))
      .filter((zone) => zone.cities.length > 0);

    const isCurrentCityKnown = zones.some((zone) =>
      zone.cities.some((city) => normalizeCityName(city) === normalizeCityName(value)),
    );
    const showUnknownCurrentCity =
      value.length > 0 && !isCurrentCityKnown && normalizeCityName(value).includes(normalizedQuery);

    const selectCity = (city: string) => {
      setQuery(city);
      onChange(city);
    };

    return (
      <Autocomplete>
        <AutocompleteInput
          {...inputProps}
          ref={ref}
          placeholder={deliveryZonesQuery.isLoading ? "Loading cities…" : "Select your city"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onBlur={(event) => {
            setQuery(value);
            onBlur?.(event);
          }}
        />

        <AutocompleteContent className="mt-2">
          {deliveryZonesQuery.isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="mx-1.5 my-1 h-7 rounded-md" />
            ))}

          {!deliveryZonesQuery.isLoading &&
            visibleZones.length === 0 &&
            !showUnknownCurrentCity && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No cities found for &ldquo;{query}&rdquo;
              </p>
            )}

          {showUnknownCurrentCity && (
            <AutocompleteItem value={value} onSelect={() => selectCity(value)}>
              <span className="truncate text-[13px] text-foreground">{value}</span>
            </AutocompleteItem>
          )}

          {visibleZones.map((zone) => (
            <AutocompleteGroup key={zone.id} label={zone.name}>
              {zone.cities.map((city) => (
                <AutocompleteItem key={city} value={city} onSelect={() => selectCity(city)}>
                  <span className="truncate text-[13px] text-foreground">{city}</span>
                </AutocompleteItem>
              ))}
            </AutocompleteGroup>
          ))}
        </AutocompleteContent>
      </Autocomplete>
    );
  },
);
CityAutocomplete.displayName = "CityAutocomplete";
