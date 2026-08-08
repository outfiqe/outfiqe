import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";
import type { TokenPurpose, UserSession } from "../types";
import {
  brandInviteInfoSchema,
  brandUserSchema,
  currentUserSchema,
  customerUserSchema,
  toUserSession,
  validateTokenResponseSchema,
} from "./userSchemas";
import type { BrandInviteInfo } from "./userSchemas";
import type { BrandRegisterInput } from "../schemas/brandRegister.schema";
import type { ForgotPasswordInput } from "../schemas/forgotPassword.schema";
import type { LoginInput } from "../schemas/login.schema";
import type { RegisterInput } from "../schemas/register.schema";
import type { ResetPasswordInput } from "../schemas/resetPassword.schema";

const registerResponseSchema = z.object({ userId: z.string() });
const loginResponseSchema = z.object({ accessToken: z.string(), user: customerUserSchema });
const brandLoginResponseSchema = z.object({ accessToken: z.string(), user: brandUserSchema });
const refreshResponseSchema = z.object({ accessToken: z.string() });

export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type LoginResponse = { accessToken: string; user: UserSession };
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type { BrandInviteInfo };
export type MessageResponse = { message: string };

//TODO: Add Proper Data TYPES

export const authApi = {
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const res = await apiClient.post<unknown>("/auth/register", input);
    return registerResponseSchema.parse(res.data);
  },

  async registerBrand(input: BrandRegisterInput): Promise<LoginResponse> {
    const res = await apiClient.post<unknown>("/auth/register/brand", input);
    const { accessToken, user } = brandLoginResponseSchema.parse(res.data);
    return { accessToken, user: toUserSession(user) };
  },

  async login(input: LoginInput): Promise<LoginResponse> {
    const res = await apiClient.post<unknown>("/auth/login", input);
    const { accessToken, user } = loginResponseSchema.parse(res.data);
    return { accessToken, user: toUserSession(user) };
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async refresh(): Promise<RefreshResponse> {
    const res = await apiClient.post<unknown>("/auth/refresh", undefined, {
      skipAuthRetry: true,
    });
    return refreshResponseSchema.parse(res.data);
  },

  async getCurrentUser(): Promise<UserSession> {
    const res = await apiClient.get<unknown>("/auth/me");
    return toUserSession(currentUserSchema.parse(res.data));
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
    const res = await apiClient.post<unknown>("/auth/forgot-password", input);
    return { message: res.message };
  },

  async resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
    const res = await apiClient.post<unknown>("/auth/reset-password", input);
    return { message: res.message };
  },

  async verifyEmail(token: string): Promise<MessageResponse> {
    const res = await apiClient.post<unknown>("/auth/verify-email", { token });
    return { message: res.message };
  },

  async resendVerification(email: string): Promise<MessageResponse> {
    const res = await apiClient.post<unknown>("/auth/resend-verification", { email });
    return { message: res.message };
  },

  async getBrandInvite(token: string): Promise<BrandInviteInfo> {
    const res = await apiClient.get<unknown>(`/auth/invite?token=${encodeURIComponent(token)}`);
    return brandInviteInfoSchema.parse(res.data);
  },

  async validateToken(token: string, purpose: TokenPurpose): Promise<boolean> {
    const res = await apiClient.get<unknown>(
      `/auth/validate-token?token=${encodeURIComponent(token)}&purpose=${purpose}`,
    );
    return validateTokenResponseSchema.parse(res.data).valid;
  },
};
