import type { UserRole } from "@outfiqe/types";
import { z } from "zod";

const userRoleValues = ["CUSTOMER", "BRAND_OWNER", "ADMIN"] satisfies UserRole[];
export const userRoleSchema = z.enum(userRoleValues);

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  avatarUrl: z.url().nullable(),
  role: userRoleSchema,
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: adminUserSchema,
});

export const refreshResponseSchema = z.object({ accessToken: z.string() });

export const adminInviteInfoSchema = z.object({ email: z.email(), name: z.string() });
export type AdminInviteInfo = z.infer<typeof adminInviteInfoSchema>;
