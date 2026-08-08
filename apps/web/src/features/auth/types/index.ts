import { z } from "zod";

export enum UserRole {
  CUSTOMER = "CUSTOMER",
  BRAND_OWNER = "BRAND_OWNER",
  ADMIN = "ADMIN",
}

export enum CreatorStatus {
  NONE = "NONE",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
}

export enum TokenPurpose {
  EMAIL_VERIFICATION = "email-verification",
  PASSWORD_RESET = "password-reset",
}

export const userRoleSchema = z.enum(UserRole);
export const creatorStatusSchema = z.enum(CreatorStatus);

export const userSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
  brandId: z.string().optional(),
});
export type UserSession = z.infer<typeof userSessionSchema>;

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
}

export type AuthAction =
  | { type: AuthActionType.AUTH_SUCCESS; payload: { user: UserSession; accessToken: string } }
  | { type: AuthActionType.AUTH_LOGOUT }
  | { type: AuthActionType.AUTH_LOADING }
  | { type: AuthActionType.TOKEN_REFRESHED; payload: { accessToken: string } };
