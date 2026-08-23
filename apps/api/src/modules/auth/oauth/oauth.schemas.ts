import { z } from "zod";

import { OAuthProviderParam } from "./oauth.constants.js";

export const oauthProviderParamsSchema = z.object({
  provider: z.enum(OAuthProviderParam),
});

export const oauthStartQuerySchema = z.object({
  redirect: z.string().optional(),
});

export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
});

export const oauthLinkConfirmBodySchema = z.object({
  linkToken: z.string().min(1),
  password: z.string().min(1),
});

export const oauthUnlinkBodySchema = z.object({
  password: z.string().min(1).optional(),
});

export type OAuthProviderParams = z.infer<typeof oauthProviderParamsSchema>;
export type OAuthStartQuery = z.infer<typeof oauthStartQuerySchema>;
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
export type OAuthLinkConfirmBody = z.infer<typeof oauthLinkConfirmBodySchema>;
export type OAuthUnlinkBody = z.infer<typeof oauthUnlinkBodySchema>;
