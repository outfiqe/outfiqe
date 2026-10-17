import { z } from "zod";

import { IdentityDocumentType, RiderEmploymentType, RiderStatus } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const IDENTITY_LAST4_PATTERN = /^[A-Za-z0-9]{4}$/;

export const inviteRiderSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase().trim()),
  name: z.string().trim().min(2).max(100),
  hubId: z.uuid(),
  employmentType: z.enum(RiderEmploymentType),
});

export const riderIdParamSchema = z.object({ riderId: z.uuid() });

export const listRidersQuerySchema = z.object({
  hubId: z.uuid().optional(),
  status: z.enum(RiderStatus).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const verifyRiderIdentitySchema = z.object({
  documentType: z.enum(IdentityDocumentType),
  documentLast4: z
    .string()
    .trim()
    .regex(IDENTITY_LAST4_PATTERN, "Enter the last 4 letters or digits of the document."),
});

export const updateRiderStatusSchema = z.object({
  status: z.enum([RiderStatus.ACTIVE, RiderStatus.SUSPENDED, RiderStatus.OFFBOARDED]),
});

export const updateRiderVehicleSchema = z.object({
  vehicleType: z.string().trim().min(1).max(40).nullable(),
  vehicleNumber: z.string().trim().min(1).max(20).nullable(),
});

export type InviteRiderBody = z.infer<typeof inviteRiderSchema>;
export type RiderIdParam = z.infer<typeof riderIdParamSchema>;
export type ListRidersQuery = z.infer<typeof listRidersQuerySchema>;
export type VerifyRiderIdentityBody = z.infer<typeof verifyRiderIdentitySchema>;
export type UpdateRiderStatusBody = z.infer<typeof updateRiderStatusSchema>;
export type UpdateRiderVehicleBody = z.infer<typeof updateRiderVehicleSchema>;
