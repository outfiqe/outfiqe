import { z } from "zod";

import {
  CONFIRM_PASSWORD_ISSUE,
  emailField,
  nameField,
  passwordField,
  passwordsMatch,
  phoneField,
} from "./shared.schema";

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
    captchaToken: z.string().optional(),
  })
  .refine(passwordsMatch, CONFIRM_PASSWORD_ISSUE);

export type RegisterInput = z.infer<typeof registerSchema>;
