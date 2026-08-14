import type { Request, Response } from "express";

import { TokenPurpose } from "#constants/enums/auth.enum.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { clearRefreshCookie, getRefreshTokenCookie, setRefreshCookie } from "#lib/cookie.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AdminInviteQuery,
  BrandInviteQuery,
  ForgotPasswordBody,
  LoginBody,
  RegisterAdminBody,
  RegisterBody,
  RegisterBrandBody,
  ResendVerificationBody,
  ResetPasswordBody,
  ValidateTokenQuery,
  VerifyEmailBody,
} from "./auth.schemas.js";
import { authService } from "./auth.service.js";

const CREATED_STATUS = 201;

const QUERY_PURPOSE_TO_TOKEN_PURPOSE: Record<ValidateTokenQuery["purpose"], TokenPurpose> = {
  "email-verification": TokenPurpose.EMAIL_VERIFICATION,
  "password-reset": TokenPurpose.PASSWORD_RESET,
};

export const authController = {
  async register(_req: Request, res: Response) {
    const { name, email, phone, password } = validated.body<RegisterBody>(res);
    const { userId } = await authService.register({ name, email, phone, password });

    sendSuccess(
      res,
      { userId },
      "Account created. Please check your email to verify your address.",
      CREATED_STATUS,
    );
  },

  async verifyEmail(_req: Request, res: Response) {
    const { token } = validated.body<VerifyEmailBody>(res);
    await authService.verifyEmail(token);

    sendSuccess(res, null, "Email verified. You can now sign in.");
  },

  async login(_req: Request, res: Response) {
    const { email, password } = validated.body<LoginBody>(res);
    const { accessToken, refreshToken, refreshTokenTtlSeconds, user } = await authService.login(
      email,
      password,
    );

    setRefreshCookie(res, refreshToken, refreshTokenTtlSeconds);
    sendSuccess(res, { accessToken, user }, "Login successful");
  },

  async refresh(req: Request, res: Response) {
    const rawRefreshToken = getRefreshTokenCookie(req);
    const { accessToken, refreshToken, refreshTokenTtlSeconds } =
      await authService.refresh(rawRefreshToken);

    setRefreshCookie(res, refreshToken, refreshTokenTtlSeconds);
    sendSuccess(res, { accessToken }, "Token refreshed successfully");
  },

  async session(req: Request, res: Response) {
    const { accessToken } = await authService.validateSession(getRefreshTokenCookie(req));

    sendSuccess(res, { accessToken }, "Session is valid.");
  },

  async logout(req: Request, res: Response) {
    await authService.logout(getRefreshTokenCookie(req));

    clearRefreshCookie(res);
    sendSuccess(res, null, "Signed out.");
  },

  async forgotPassword(_req: Request, res: Response) {
    const { email } = validated.body<ForgotPasswordBody>(res);
    await authService.forgotPassword(email);

    sendSuccess(res, null, "If that email is registered, you will receive a reset link shortly.");
  },

  async resetPassword(_req: Request, res: Response) {
    const { token, password } = validated.body<ResetPasswordBody>(res);
    await authService.resetPassword(token, password);

    clearRefreshCookie(res);
    sendSuccess(res, null, "Password updated. Please sign in with your new password.");
  },

  async registerBrand(_req: Request, res: Response) {
    const { inviteToken, name, phone, password } = validated.body<RegisterBrandBody>(res);
    const { accessToken, refreshToken, refreshTokenTtlSeconds, user } =
      await authService.registerBrand({ inviteToken, name, phone, password });

    setRefreshCookie(res, refreshToken, refreshTokenTtlSeconds);
    sendSuccess(res, { accessToken, user }, "Brand account created.", CREATED_STATUS);
  },

  async getBrandInvite(_req: Request, res: Response) {
    const { token } = validated.query<BrandInviteQuery>(res);
    const invite = await authService.getBrandInvite(token);

    sendSuccess(res, invite, "Invite is valid.");
  },

  async registerAdmin(_req: Request, res: Response) {
    const { inviteToken, phone, password } = validated.body<RegisterAdminBody>(res);
    const { accessToken, refreshToken, refreshTokenTtlSeconds, user } =
      await authService.registerAdmin({ inviteToken, phone, password });

    setRefreshCookie(res, refreshToken, refreshTokenTtlSeconds);
    sendSuccess(res, { accessToken, user }, "Admin account created.", CREATED_STATUS);
  },

  async getAdminInvite(_req: Request, res: Response) {
    const { token } = validated.query<AdminInviteQuery>(res);
    const invite = await authService.getAdminInvite(token);

    sendSuccess(res, invite, "Invite is valid.");
  },

  async validateToken(_req: Request, res: Response) {
    const { token, purpose } = validated.query<ValidateTokenQuery>(res);
    await authService.validateToken(token, QUERY_PURPOSE_TO_TOKEN_PURPOSE[purpose]);

    sendSuccess(res, { valid: true }, "Token is valid.");
  },

  async resendVerification(_req: Request, res: Response) {
    const { email } = validated.body<ResendVerificationBody>(res);
    await authService.resendVerification(email);

    sendSuccess(res, null, "If that email is registered, a new verification link is on its way.");
  },

  async me(_req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);

    const user = await authService.getCurrentUser(principal.userId);
    sendSuccess(res, user, "Current user.");
  },
};
