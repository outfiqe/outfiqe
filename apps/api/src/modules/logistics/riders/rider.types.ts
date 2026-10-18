import type {
  IdentityDocumentType,
  RiderEmploymentType,
  RiderStatus,
} from "#generated/prisma/enums.js";

export type RiderView = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  hubId: string;
  hubName: string;
  employmentType: RiderEmploymentType;
  status: RiderStatus;
  vehicleType: string | null;
  vehicleNumber: string | null;
  identityDocumentType: IdentityDocumentType | null;
  identityDocumentLast4: string | null;
  identityVerifiedAt: string | null;
};

export type RiderInviteView = {
  id: string;
  email: string;
  name: string;
  hubName: string;
  employmentType: RiderEmploymentType;
  expiresAt: string;
};
