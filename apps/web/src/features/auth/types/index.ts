import type { CreatorStatus as CreatorStatusType, UserRole as UserRoleType } from "@outfiqe/types";
import { z } from "zod";

export const UserRole = {
  CUSTOMER: "CUSTOMER",
  BRAND_OWNER: "BRAND_OWNER",
  ADMIN: "ADMIN",
} as const satisfies Record<string, UserRoleType>;
export type UserRole = UserRoleType;

export const CreatorStatus = {
  NONE: "NONE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const satisfies Record<string, CreatorStatusType>;
export type CreatorStatus = CreatorStatusType;

export enum TokenPurpose {
  EMAIL_VERIFICATION = "email-verification",
  PASSWORD_RESET = "password-reset",
}

export const userRoleSchema = z.enum(UserRole);
export const creatorStatusSchema = z.enum(CreatorStatus);

export const userSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string().optional(),
  email: z.email(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.url().nullable(),
  role: userRoleSchema,
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
  brandId: z.string().optional(),
  hasPassword: z.boolean().optional(),
});
export type UserSession = z.infer<typeof userSessionSchema>;

export enum OAuthProvider {
  GOOGLE = "google",
  FACEBOOK = "facebook",
}

export type LinkedOAuthAccount = {
  provider: OAuthProvider;
  emailAtLinkTime: string;
  connectedAt: string;
};

export enum AuthStatus {
  IDLE = "idle",
  LOADING = "loading",
  AUTHENTICATED = "authenticated",
  UNAUTHENTICATED = "unauthenticated",
}

export interface AuthState {
  user: UserSession | null;
  accessToken: string | null;
  status: AuthStatus;
}

export enum AuthActionType {
  AUTH_SUCCESS = "AUTH_SUCCESS",
  AUTH_LOGOUT = "AUTH_LOGOUT",
  AUTH_LOADING = "AUTH_LOADING",
  TOKEN_REFRESHED = "TOKEN_REFRESHED",
  USER_UPDATED = "USER_UPDATED",
}

export type AuthAction =
  | { type: AuthActionType.AUTH_SUCCESS; payload: { user: UserSession; accessToken: string } }
  | { type: AuthActionType.AUTH_LOGOUT }
  | { type: AuthActionType.AUTH_LOADING }
  | { type: AuthActionType.TOKEN_REFRESHED; payload: { accessToken: string } }
  | { type: AuthActionType.USER_UPDATED; payload: { user: Partial<UserSession> } };
