import { z } from "zod";

export const accountStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "BANNED"]);
export type AccountStatusValue = z.infer<typeof accountStatusSchema>;

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["CUSTOMER", "BRAND_OWNER", "ADMIN"]),
  isCreator: z.boolean(),
  emailVerified: z.boolean(),
  accountStatus: accountStatusSchema,
  suspendedAt: z.string().nullable(),
  suspendedBy: z.string().nullable(),
  suspensionReason: z.string().nullable(),
  suspensionExpiresAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;
