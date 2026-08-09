import { z } from "zod";
import type { UserRole } from "@outfiqe/shared-types";

const userRoleValues = ["CUSTOMER", "BRAND_OWNER", "ADMIN"] satisfies UserRole[];
export const userRoleSchema = z.enum(userRoleValues);

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: adminUserSchema,
});

export const refreshResponseSchema = z.object({ accessToken: z.string() });

export const adminInviteInfoSchema = z.object({ email: z.email(), name: z.string() });
export type AdminInviteInfo = z.infer<typeof adminInviteInfoSchema>;
