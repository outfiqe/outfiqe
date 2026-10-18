import { z } from "zod";

import {
  CONFIRM_PASSWORD_ISSUE,
  passwordField,
  passwordsMatch,
  phoneField,
} from "../../schemas/shared.schema";

export const riderRegisterSchema = z
  .object({
    inviteToken: z.string().min(1),
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, CONFIRM_PASSWORD_ISSUE);

export type RiderRegisterInput = z.infer<typeof riderRegisterSchema>;
