import type { DeliveryZone } from "../api/deliveryZoneSchemas";

const normalizeCityName = (city: string) => city.trim().toLowerCase();

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
