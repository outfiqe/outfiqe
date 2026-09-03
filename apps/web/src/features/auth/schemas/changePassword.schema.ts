import { z } from "zod";

import { passwordField } from "./shared.schema";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordField,
    confirmNewPassword: z.string(),
  })
  .refine((fields) => fields.newPassword === fields.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
