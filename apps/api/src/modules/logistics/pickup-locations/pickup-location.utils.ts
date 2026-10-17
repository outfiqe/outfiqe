import type { PickupLocationRecord } from "./pickup-location.repository.js";
import type { PickupLocationView } from "./pickup-location.types.js";

const toCoordinate = (value: PickupLocationRecord["latitude"]): number | null =>
  value === null ? null : value.toNumber();

export const toPickupLocationView = (
  location: PickupLocationRecord,
  isCoveredByOutfiqePickup: boolean,
): PickupLocationView => ({
  id: location.id,
  label: location.label,
  contactName: location.contactName,
  contactPhone: location.contactPhoneE164,
  address: location.address,
  landmark: location.landmark,
  city: location.city,
  countryCode: location.countryCode,
  latitude: toCoordinate(location.latitude),
  longitude: toCoordinate(location.longitude),
  openingNote: location.openingNote,
  isDefault: location.isDefault,
  isCoveredByOutfiqePickup,
});
