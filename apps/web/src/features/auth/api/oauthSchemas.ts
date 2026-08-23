import { z } from "zod";

import { OAuthProvider } from "../types";

export const linkedOAuthAccountSchema = z.object({
  provider: z.enum(OAuthProvider),
  emailAtLinkTime: z.string(),
  connectedAt: z.string(),
});

export const linkedAccountsResponseSchema = z.object({
  accounts: z.array(linkedOAuthAccountSchema),
});

export const oauthLinkConfirmResponseSchema = z.object({
  accessToken: z.string(),
});
