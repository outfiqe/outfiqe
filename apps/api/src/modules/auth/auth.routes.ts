import { Router } from "express";
import { validate, validated } from "../../shared/middlewares/validate.js";
import { rateLimit } from "../../shared/middlewares/rate-limit.js";
import { requireAuth } from "../../shared/middlewares/require-auth.js";
import {
  brandInviteQuerySchema,
  forgotPasswordSchema,
  loginSchema,
  registerBrandSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  validateTokenQuerySchema,
  verifyEmailSchema,
} from "./auth.schemas.js";
import { authController } from "./auth.controller.js";
import type { ForgotPasswordBody, ResendVerificationBody } from "./auth.schemas.js";

const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_PASSWORD_MAX_REQUESTS = 3;

const forgotPasswordRateLimit = rateLimit({
  windowMs: FORGOT_PASSWORD_WINDOW_MS,
  max: FORGOT_PASSWORD_MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<ForgotPasswordBody>(res).email.toLowerCase(),
  message: "Too many password reset requests. Please try again in 15 minutes.",
});

const resendVerificationRateLimit = rateLimit({
  windowMs: FORGOT_PASSWORD_WINDOW_MS,
  max: FORGOT_PASSWORD_MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<ResendVerificationBody>(res).email.toLowerCase(),
  message: "Too many verification requests. Please try again in 15 minutes.",
});

export const authRoutes = Router();

authRoutes.post("/register", validate({ body: registerSchema }), authController.register);
authRoutes.post("/verify-email", validate({ body: verifyEmailSchema }), authController.verifyEmail);
authRoutes.post("/login", validate({ body: loginSchema }), authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.post(
  "/forgot-password",
  validate({ body: forgotPasswordSchema }),
  forgotPasswordRateLimit,
  authController.forgotPassword,
);
authRoutes.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
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
