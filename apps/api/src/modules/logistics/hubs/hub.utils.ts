import type { HubRecord } from "./hub.repository.js";
import type { HubView } from "./hub.types.js";

export const toHubView = (hub: HubRecord): HubView => ({
  id: hub.id,
  name: hub.name,
  countryCode: hub.countryCode,
  address: hub.address,
  city: hub.city,
  phone: hub.phoneE164,
  timeZone: hub.timeZone,
  workingDays: hub.workingDays,
  openTime: hub.openTime,
  closeTime: hub.closeTime,
  pickupRoundTimes: hub.pickupRoundTimes,
  readyCutoffMinutes: hub.readyCutoffMinutes,
  partnerCollectionTime: hub.partnerCollectionTime,
  isActive: hub.isActive,
  pickupZones: hub.pickupZones.map(({ deliveryZone }) => deliveryZone),
});
