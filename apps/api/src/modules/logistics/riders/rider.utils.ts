import type { RiderRecord } from "./rider.repository.js";
import type { RiderInviteView, RiderView } from "./rider.types.js";

export const toRiderView = (rider: RiderRecord): RiderView => ({
  id: rider.id,
  userId: rider.userId,
  name: rider.user.name,
  email: rider.user.email,
  phone: rider.user.phone,
  hubId: rider.hubId,
  hubName: rider.hub.name,
  employmentType: rider.employmentType,
  status: rider.status,
  vehicleType: rider.vehicleType,
  vehicleNumber: rider.vehicleNumber,
  identityDocumentType: rider.identityDocumentType,
  identityDocumentLast4: rider.identityDocumentLast4,
  identityVerifiedAt: rider.identityVerifiedAt?.toISOString() ?? null,
});

export const toRiderInviteView = (invite: {
  id: string;
  email: string;
  name: string;
  employmentType: RiderInviteView["employmentType"];
  expiresAt: Date;
  hub: { name: string };
}): RiderInviteView => ({
  id: invite.id,
  email: invite.email,
  name: invite.name,
  hubName: invite.hub.name,
  employmentType: invite.employmentType,
  expiresAt: invite.expiresAt.toISOString(),
});
