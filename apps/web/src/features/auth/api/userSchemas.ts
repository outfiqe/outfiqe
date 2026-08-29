import { z } from "zod";

import { CreatorStatus, creatorStatusSchema, userRoleSchema, type UserSession } from "../types";

export const customerUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string().optional(),
  email: z.email(),
  phone: z.string().nullable(),
  avatarUrl: z.url().nullable(),
  role: userRoleSchema,
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
  hasPassword: z.boolean(),
});

export const brandUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  avatarUrl: z.url().nullable(),
  role: userRoleSchema,
  brandId: z.string(),
});

export const currentUserSchema = z.union([customerUserSchema, brandUserSchema]);

export const brandInviteInfoSchema = z.object({ email: z.email(), brandName: z.string() });
export type BrandInviteInfo = z.infer<typeof brandInviteInfoSchema>;

export const validateTokenResponseSchema = z.object({ valid: z.boolean() });

export const toUserSession = (
  user: z.infer<typeof customerUserSchema> | z.infer<typeof brandUserSchema>,
): UserSession => {
  return {
    id: user.id,
    name: user.name,
    handle: "handle" in user ? user.handle : undefined,
    email: user.email,
    phone: "phone" in user ? user.phone : null,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isCreator: "isCreator" in user ? user.isCreator : false,
    creatorStatus: "creatorStatus" in user ? user.creatorStatus : CreatorStatus.NONE,
    brandId: "brandId" in user ? user.brandId : undefined,
    hasPassword: "hasPassword" in user ? user.hasPassword : true,
  };
};
