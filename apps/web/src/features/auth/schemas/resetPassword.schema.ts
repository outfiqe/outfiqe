import { z } from "zod";

import { CONFIRM_PASSWORD_ISSUE, passwordField, passwordsMatch } from "./shared.schema";

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, CONFIRM_PASSWORD_ISSUE);

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
