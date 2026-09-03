import { Router } from "express";

import { requireCsrfHeader } from "#middlewares/csrf.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate, validated } from "#middlewares/validate.js";

import {
  CHANGE_PASSWORD_RATE_LIMIT_MAX_REQUESTS,
  CHANGE_PASSWORD_RATE_LIMIT_WINDOW_MS,
  FORGOT_PASSWORD_MAX_REQUESTS,
  FORGOT_PASSWORD_WINDOW_MS,
  LOGIN_EMAIL_RATE_LIMIT_MAX_REQUESTS,
  LOGIN_EMAIL_RATE_LIMIT_WINDOW_MS,
  LOGIN_IP_RATE_LIMIT_MAX_REQUESTS,
  LOGIN_IP_RATE_LIMIT_WINDOW_MS,
  REFRESH_IP_RATE_LIMIT_MAX_REQUESTS,
  REFRESH_IP_RATE_LIMIT_WINDOW_MS,
  REGISTER_IP_RATE_LIMIT_MAX_REQUESTS,
  REGISTER_IP_RATE_LIMIT_WINDOW_MS,
  RESEND_VERIFICATION_MAX_REQUESTS,
  RESEND_VERIFICATION_WINDOW_MS,
  RESET_PASSWORD_IP_RATE_LIMIT_MAX_REQUESTS,
  RESET_PASSWORD_IP_RATE_LIMIT_WINDOW_MS,
} from "./auth.constants.js";
import { authController } from "./auth.controller.js";
import type { ForgotPasswordBody, LoginBody, ResendVerificationBody } from "./auth.schemas.js";
import {
  adminInviteQuerySchema,
  brandInviteQuerySchema,
  changePasswordSchema,
  crmInviteQuerySchema,
  forgotPasswordSchema,
  loginSchema,
  registerAdminSchema,
  registerBrandSchema,
  registerCrmInviteSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  validateTokenQuerySchema,
  verifyEmailSchema,
} from "./auth.schemas.js";

const forgotPasswordRateLimit = rateLimit({
  namespace: "forgot-password",
  windowMs: FORGOT_PASSWORD_WINDOW_MS,
  max: FORGOT_PASSWORD_MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<ForgotPasswordBody>(res).email.toLowerCase(),
  message: "Too many password reset requests. Please try again in 15 minutes.",
});

const resendVerificationRateLimit = rateLimit({
  namespace: "resend-verification",
  windowMs: RESEND_VERIFICATION_WINDOW_MS,
  max: RESEND_VERIFICATION_MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<ResendVerificationBody>(res).email.toLowerCase(),
  message: "Too many verification requests. Please try again in 15 minutes.",
});

const loginIpRateLimit = rateLimit({
  namespace: "login-ip",
  windowMs: LOGIN_IP_RATE_LIMIT_WINDOW_MS,
  max: LOGIN_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

const loginEmailRateLimit = rateLimit({
  namespace: "login-email",
  windowMs: LOGIN_EMAIL_RATE_LIMIT_WINDOW_MS,
  max: LOGIN_EMAIL_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<LoginBody>(res).email.toLowerCase(),
  message: "Too many login attempts for this account. Please try again in 15 minutes.",
});

const registerIpRateLimit = rateLimit({
  namespace: "register-ip",
  windowMs: REGISTER_IP_RATE_LIMIT_WINDOW_MS,
  max: REGISTER_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many registration attempts. Please try again later.",
});

const refreshIpRateLimit = rateLimit({
  namespace: "refresh-ip",
  windowMs: REFRESH_IP_RATE_LIMIT_WINDOW_MS,
  max: REFRESH_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many requests. Please try again in 15 minutes.",
});

const resetPasswordIpRateLimit = rateLimit({
  namespace: "reset-password-ip",
  windowMs: RESET_PASSWORD_IP_RATE_LIMIT_WINDOW_MS,
  max: RESET_PASSWORD_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many password reset attempts. Please try again in 15 minutes.",
});

const changePasswordRateLimit = rateLimit({
  namespace: "change-password",
  windowMs: CHANGE_PASSWORD_RATE_LIMIT_WINDOW_MS,
  max: CHANGE_PASSWORD_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many password change attempts. Please try again in 15 minutes.",
});

export const authRoutes = Router();

authRoutes.post(
  "/register",
  registerIpRateLimit,
  validate({ body: registerSchema }),
  authController.register,
);
authRoutes.post("/verify-email", validate({ body: verifyEmailSchema }), authController.verifyEmail);
authRoutes.post(
  "/login",
  loginIpRateLimit,
  validate({ body: loginSchema }),
  loginEmailRateLimit,
  authController.login,
);
authRoutes.post("/refresh", refreshIpRateLimit, requireCsrfHeader, authController.refresh);
authRoutes.post("/session", authController.session);
authRoutes.post("/logout", requireCsrfHeader, authController.logout);
authRoutes.post(
  "/forgot-password",
  validate({ body: forgotPasswordSchema }),
  forgotPasswordRateLimit,
  authController.forgotPassword,
);
authRoutes.post(
  "/reset-password",
  resetPasswordIpRateLimit,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);
authRoutes.post(
  "/change-password",
  requireAuth,
  changePasswordRateLimit,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);
authRoutes.post(
  "/register/brand",
  validate({ body: registerBrandSchema }),
  authController.registerBrand,
);
authRoutes.get(
  "/invite",
  validate({ query: brandInviteQuerySchema }),
  authController.getBrandInvite,
);
authRoutes.post(
  "/register/admin",
  validate({ body: registerAdminSchema }),
  authController.registerAdmin,
);
authRoutes.get(
  "/invite/admin",
  validate({ query: adminInviteQuerySchema }),
  authController.getAdminInvite,
);
authRoutes.get(
  "/invite/crm",
  validate({ query: crmInviteQuerySchema }),
  authController.getCrmInvite,
);
authRoutes.post(
  "/register/crm-invite",
  registerIpRateLimit,
  validate({ body: registerCrmInviteSchema }),
  authController.registerFromCrmInvite,
);
authRoutes.get(
  "/validate-token",
  validate({ query: validateTokenQuerySchema }),
  authController.validateToken,
);
authRoutes.post(
  "/resend-verification",
  validate({ body: resendVerificationSchema }),
  resendVerificationRateLimit,
  authController.resendVerification,
);
authRoutes.get("/me", requireAuth, authController.me);
