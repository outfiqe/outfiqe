import type { PartnerRecord } from "./partner.repository.js";
import type { PartnerView } from "./partner.types.js";

export const toPartnerView = ({
  accounts,
  zones,
  statusMappings,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  ...partner
}: PartnerRecord): PartnerView => ({
  ...partner,
  accounts: accounts.map(
    ({ hubId, hub, merchantAccountRef, pickupPointRef, credentialsKey, isActive }) => ({
      hubId,
      hubName: hub.name,
      merchantAccountRef,
      pickupPointRef,
      credentialsKey,
      isActive,
    }),
  ),
  zones: zones.map(({ hubId, deliveryZoneId, deliveryZone, priority, isActive }) => ({
    hubId,
    deliveryZoneId,
    deliveryZoneName: deliveryZone.name,
    priority,
    isActive,
  })),
  statusMappings: statusMappings.map(({ rawStatus, canonicalCode, reasonCode }) => ({
    rawStatus,
    canonicalCode,
    reasonCode,
  })),
});
