import { z } from "zod";

import { NEPAL_PHONE_REGEX } from "@outfiqe/shared-utils";

const NAME_MIN = 2;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export const nameField = z
  .string()
  .trim()
  .min(NAME_MIN, "Name must be at least 2 characters")
  .max(NAME_MAX);

export const phoneField = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(NEPAL_PHONE_REGEX, "Enter a valid Nepali phone number starting with 98"));

export const emailField = z
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase().trim());

export const passwordField = z
  .string()
  .min(PASSWORD_MIN, "Password must be at least 8 characters")
  .max(PASSWORD_MAX);

export const passwordsMatch = (data: { password: string; confirmPassword: string }): boolean =>
  data.password === data.confirmPassword;

export const CONFIRM_PASSWORD_ISSUE = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};
