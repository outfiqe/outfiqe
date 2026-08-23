import { z } from "zod";

export const confirmOAuthLinkSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type ConfirmOAuthLinkFormInput = z.infer<typeof confirmOAuthLinkSchema>;

export const unlinkOAuthAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type UnlinkOAuthAccountFormInput = z.infer<typeof unlinkOAuthAccountSchema>;
