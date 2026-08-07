import type { Request, Response } from "express";
import { validated } from "../../shared/middlewares/validate.js";
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  RegisterBrandBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "./auth.schemas.js";
import { authService } from "./auth.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";
import { clearRefreshCookie, getRefreshTokenCookie, setRefreshCookie } from "#lib/cookie.utils.js";

const CREATED_STATUS = 201;

export const authController = {
  async register(_req: Request, res: Response) {
    const { name, email, phone, password } = validated.body<RegisterBody>(res);
    const result = await authService.register({ name, email, phone, password });

    sendSuccess(
      res,
      result,
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
};
