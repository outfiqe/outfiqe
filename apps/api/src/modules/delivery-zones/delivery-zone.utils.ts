import type {
  DeliveryZoneDeliveryDays,
  DeliveryZoneFeeValues,
  DeliveryZoneRecord,
  DeliveryZoneSnapshot,
  DeliveryZoneView,
} from "./delivery-zone.types.js";

export const toFeeValues = (record: DeliveryZoneFeeValues): DeliveryZoneFeeValues => ({
  standardDeliveryFee: record.standardDeliveryFee,
  freeDeliveryThreshold: record.freeDeliveryThreshold,
  codHandlingFee: record.codHandlingFee,
});

export const toDeliveryDays = (record: DeliveryZoneDeliveryDays): DeliveryZoneDeliveryDays => ({
  minDeliveryDays: record.minDeliveryDays,
  maxDeliveryDays: record.maxDeliveryDays,
});

export const toView = (record: DeliveryZoneRecord): DeliveryZoneView => ({
  id: record.id,
  name: record.name,
  countryCode: record.countryCode,
  isDefault: record.isDefault,
  cities: record.cities.map((city) => city.city),
  ...toFeeValues(record),
  ...toDeliveryDays(record),
  updatedAt: record.updatedAt.toISOString(),
});

export const toSnapshot = (record: DeliveryZoneRecord): DeliveryZoneSnapshot => ({
  name: record.name,
  isDefault: record.isDefault,
  cities: record.cities.map((city) => city.city),
  ...toFeeValues(record),
  ...toDeliveryDays(record),
});
