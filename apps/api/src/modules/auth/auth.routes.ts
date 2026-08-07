import { Router } from "express";
import { validate, validated } from "../../shared/middlewares/validate.js";
import { rateLimit } from "../../shared/middlewares/rate-limit.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerBrandSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";
import { authController } from "./auth.controller.js";
import type { ForgotPasswordBody } from "./auth.schemas.js";

const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_PASSWORD_MAX_REQUESTS = 3;

const forgotPasswordRateLimit = rateLimit({
  windowMs: FORGOT_PASSWORD_WINDOW_MS,
  max: FORGOT_PASSWORD_MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<ForgotPasswordBody>(res).email.toLowerCase(),
  message: "Too many password reset requests. Please try again in 15 minutes.",
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
