import { z } from "zod";

export const RIDER_STATUS = {
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  OFFBOARDED: "OFFBOARDED",
} as const;
export const riderStatusSchema = z.enum(RIDER_STATUS);
export type RiderStatus = z.infer<typeof riderStatusSchema>;

export const RIDER_EMPLOYMENT_TYPE = { EMPLOYEE: "EMPLOYEE", CONTRACTOR: "CONTRACTOR" } as const;
export const riderEmploymentTypeSchema = z.enum(RIDER_EMPLOYMENT_TYPE);
export type RiderEmploymentType = z.infer<typeof riderEmploymentTypeSchema>;

export const IDENTITY_DOCUMENT_TYPE = {
  CITIZENSHIP: "CITIZENSHIP",
  DRIVING_LICENCE: "DRIVING_LICENCE",
  PASSPORT: "PASSPORT",
  NATIONAL_ID: "NATIONAL_ID",
} as const;
export const identityDocumentTypeSchema = z.enum(IDENTITY_DOCUMENT_TYPE);
export type IdentityDocumentType = z.infer<typeof identityDocumentTypeSchema>;

export const riderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  hubId: z.string(),
  hubName: z.string(),
  employmentType: riderEmploymentTypeSchema,
  status: riderStatusSchema,
  vehicleType: z.string().nullable(),
  vehicleNumber: z.string().nullable(),
  identityDocumentType: identityDocumentTypeSchema.nullable(),
  identityDocumentLast4: z.string().nullable(),
  identityVerifiedAt: z.string().nullable(),
});
export type Rider = z.infer<typeof riderSchema>;

export const ridersPageSchema = z.object({
  items: z.array(riderSchema),
  nextCursor: z.string().nullable(),
});
export type RidersPage = z.infer<typeof ridersPageSchema>;

export const riderInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  hubName: z.string(),
  employmentType: riderEmploymentTypeSchema,
  expiresAt: z.string(),
});
export type RiderInvite = z.infer<typeof riderInviteSchema>;

export const riderInvitesResponseSchema = z.object({ invites: z.array(riderInviteSchema) });

export type InviteRiderBody = {
  email: string;
  name: string;
  hubId: string;
  employmentType: RiderEmploymentType;
};

export type RiderIdentityCheckBody = {
  documentType: IdentityDocumentType;
  documentLast4: string;
};
