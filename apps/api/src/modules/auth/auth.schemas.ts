import { z } from "zod";

import { phoneSchema } from "#lib/phone.utils.js";

const NAME_MIN = 2;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const passwordField = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;

const CONFIRM_PASSWORD_ISSUE = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

export const registerSchema = z
  .object({
    name: z.string().min(NAME_MIN).max(NAME_MAX),
    email: z.email(),
    phone: phoneSchema,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, CONFIRM_PASSWORD_ISSUE);

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, CONFIRM_PASSWORD_ISSUE);

export const registerBrandSchema = z
  .object({
    inviteToken: z.string().min(1),
    name: z.string().min(NAME_MIN).max(NAME_MAX),
    phone: phoneSchema,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, CONFIRM_PASSWORD_ISSUE);

export const brandInviteQuerySchema = z.object({
  token: z.string().min(1),
});

export const validateTokenQuerySchema = z.object({
  token: z.string().min(1),
  purpose: z.enum(["email-verification", "password-reset"]),
});

export const resendVerificationSchema = z.object({
  email: z.email(),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type RegisterBrandBody = z.infer<typeof registerBrandSchema>;
export type BrandInviteQuery = z.infer<typeof brandInviteQuerySchema>;
export type ValidateTokenQuery = z.infer<typeof validateTokenQuerySchema>;
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>;
