import type {
  DeliveryZoneFeeValues,
  DeliveryZoneRecord,
  DeliveryZoneSnapshot,
  DeliveryZoneView,
} from "./deliveryZone.types.js";

export const normalizeCityName = (city: string): string => city.trim().toLowerCase();

export const toFeeValues = (record: DeliveryZoneRecord): DeliveryZoneFeeValues => ({
  standardDeliveryFee: record.standardDeliveryFee,
  freeDeliveryThreshold: record.freeDeliveryThreshold,
  codHandlingFee: record.codHandlingFee,
});

export const toView = (record: DeliveryZoneRecord): DeliveryZoneView => ({
  id: record.id,
  name: record.name,
  isDefault: record.isDefault,
  cities: record.cities.map((city) => city.city),
  ...toFeeValues(record),
  updatedAt: record.updatedAt.toISOString(),
});

export const toSnapshot = (record: DeliveryZoneRecord): DeliveryZoneSnapshot => ({
  name: record.name,
  isDefault: record.isDefault,
  cities: record.cities.map((city) => city.city),
  ...toFeeValues(record),
});
