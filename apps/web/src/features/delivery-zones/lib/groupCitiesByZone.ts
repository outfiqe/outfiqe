import type { DeliveryZoneCityMatch } from "../api/deliveryZoneSchemas";

export type CityZoneGroup = {
  zoneId: string;
  zoneName: string;
  cities: DeliveryZoneCityMatch[];
};

export const groupCitiesByZone = (matches: DeliveryZoneCityMatch[]): CityZoneGroup[] => {
  const groupsByZoneId = new Map<string, CityZoneGroup>();

  for (const match of matches) {
    const group = groupsByZoneId.get(match.zoneId);
    if (group) {
      group.cities.push(match);
    } else {
      groupsByZoneId.set(match.zoneId, {
        zoneId: match.zoneId,
        zoneName: match.zoneName,
        cities: [match],
      });
    }
  }

  return [...groupsByZoneId.values()];
};
