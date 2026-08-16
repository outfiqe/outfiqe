"use client";

import { useDeliveryZones } from "../hooks/useDeliveryZones";
import { normalizeCityName } from "../lib/resolveZonePreview";

type CityZoneOptionsProps = {
  currentCity?: string | null;
};

export const CityZoneOptions = ({ currentCity }: CityZoneOptionsProps) => {
  const deliveryZonesQuery = useDeliveryZones();
  const zones = deliveryZonesQuery.data ?? [];

  const normalizedCurrentCity = currentCity ? normalizeCityName(currentCity) : "";
  const isCurrentCityKnown = zones.some((zone) =>
    zone.cities.some((city) => normalizeCityName(city) === normalizedCurrentCity),
  );

  return (
    <>
      <option value="" disabled>
        {deliveryZonesQuery.isLoading ? "Loading cities…" : "Select your city"}
      </option>
      {currentCity && !isCurrentCityKnown && <option value={currentCity}>{currentCity}</option>}
      {zones.map((zone) => (
        <optgroup key={zone.id} label={zone.name}>
          {zone.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
};
