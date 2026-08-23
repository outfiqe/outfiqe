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

export const oauthLinkBodySchema = z.object({
  password: z.string().min(1),
});

export type OAuthProviderParams = z.infer<typeof oauthProviderParamsSchema>;
export type OAuthStartQuery = z.infer<typeof oauthStartQuerySchema>;
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
export type OAuthLinkBody = z.infer<typeof oauthLinkBodySchema>;
