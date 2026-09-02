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
  hasPlatformAccess: z.boolean(),
  isCoFounder: z.boolean(),
  hiddenPlatformNavKeys: z.array(z.string()),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, "Password must be at least 8 characters")
      .max(PASSWORD_MAX),
    confirmNewPassword: z.string(),
  })
  .refine((fields) => fields.newPassword === fields.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: adminUserSchema,
});

export const refreshResponseSchema = z.object({ accessToken: z.string() });

export const adminInviteInfoSchema = z.object({ email: z.email(), name: z.string() });
export type AdminInviteInfo = z.infer<typeof adminInviteInfoSchema>;

export const crmInviteInfoSchema = z.object({
  email: z.email(),
  organizationName: z.string(),
  roleName: z.string(),
  requiresRegistration: z.boolean(),
});
export type CrmInviteInfo = z.infer<typeof crmInviteInfoSchema>;
