import { z } from "zod";

import {
  CONFIRM_PASSWORD_ISSUE,
  nameField,
  passwordField,
  passwordsMatch,
  phoneField,
} from "./shared.schema";

export const brandRegisterSchema = z
  .object({
    inviteToken: z.string().min(1),
    name: nameField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, CONFIRM_PASSWORD_ISSUE);

export type BrandRegisterInput = z.infer<typeof brandRegisterSchema>;
