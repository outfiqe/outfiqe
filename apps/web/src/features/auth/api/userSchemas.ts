import { z } from "zod";

import { CreatorStatus, creatorStatusSchema, userRoleSchema, type UserSession } from "../types";

// The backend returns two different user shapes depending on account type —
// AuthUser for customers/admins, BrandAuthUser for brand owners (see
// apps/api/src/modules/auth/auth.types.ts). Both get normalized into the
// single UserSession shape the rest of the app consumes. Pure/no fetch
// dependency on purpose, so it's usable from both the browser apiClient
// (authApi.ts) and the server-only auth helper (serverAuth.ts).
export const customerUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
});

export const brandUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  brandId: z.string(),
});

// GET /auth/me can return either shape — try customer first since it's the
// common case.
export const currentUserSchema = z.union([customerUserSchema, brandUserSchema]);

// Shared with the server-only brand-register guard (serverAuth.ts calls
// GET /auth/invite directly, without going through the browser-only
// apiClient in authApi.ts).
export const brandInviteInfoSchema = z.object({ email: z.email(), brandName: z.string() });
export type BrandInviteInfo = z.infer<typeof brandInviteInfoSchema>;

export const validateTokenResponseSchema = z.object({ valid: z.boolean() });

export function toUserSession(
  user: z.infer<typeof customerUserSchema> | z.infer<typeof brandUserSchema>,
): UserSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isCreator: "isCreator" in user ? user.isCreator : false,
    creatorStatus: "creatorStatus" in user ? user.creatorStatus : CreatorStatus.NONE,
    brandId: "brandId" in user ? user.brandId : undefined,
  };
}
