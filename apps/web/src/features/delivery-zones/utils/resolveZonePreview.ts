import type { DeliveryZone } from "../api/deliveryZoneSchemas";

export const normalizeCityName = (city: string) => city.trim().toLowerCase();

export const isListedCity = (zones: DeliveryZone[], cityInput: string): boolean => {
  const normalizedInput = normalizeCityName(cityInput);
  return zones.some((zone) =>
    zone.cities.some((city) => normalizeCityName(city) === normalizedInput),
  );
};

export const resolveZonePreview = (
  zones: DeliveryZone[],
  cityInput: string,
): DeliveryZone | undefined => {
  const normalizedInput = normalizeCityName(cityInput);
  const defaultZone = zones.find((zone) => zone.isDefault);
  if (!normalizedInput) return defaultZone;

  const matchedZone = zones.find((zone) =>
    zone.cities.some((city) => normalizeCityName(city) === normalizedInput),
  );
  return matchedZone ?? defaultZone;
};
