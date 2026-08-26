import { z } from "zod";

import { MembershipStatus } from "#generated/prisma/enums.js";

import { SUBDOMAIN_REGEX } from "./crm-access.constants.js";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  subdomain: z
    .string()
    .min(1)
    .max(63)
    .regex(SUBDOMAIN_REGEX, "Subdomain must be lowercase letters, numbers, and hyphens only."),
});

export const createOrganizationInviteSchema = z.object({
  email: z.email(),
  roleId: z.uuid(),
});

export const acceptOrganizationInviteSchema = z.object({
  token: z.string().min(1),
});

export const updateMembershipSchema = z
  .object({
    roleId: z.uuid().optional(),
    status: z.enum(MembershipStatus).optional(),
  })
  .refine((body) => body.roleId !== undefined || body.status !== undefined, {
    message: "At least one of roleId or status must be provided.",
  });

export const membershipIdParamsSchema = z.object({
  membershipId: z.uuid(),
});

export const inviteIdParamsSchema = z.object({
  inviteId: z.uuid(),
});

export type CreateOrganizationBody = z.infer<typeof createOrganizationSchema>;
export type CreateOrganizationInviteBody = z.infer<typeof createOrganizationInviteSchema>;
export type AcceptOrganizationInviteBody = z.infer<typeof acceptOrganizationInviteSchema>;
export type UpdateMembershipBody = z.infer<typeof updateMembershipSchema>;
export type MembershipIdParams = z.infer<typeof membershipIdParamsSchema>;
export type InviteIdParams = z.infer<typeof inviteIdParamsSchema>;
