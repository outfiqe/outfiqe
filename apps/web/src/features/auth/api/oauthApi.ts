import { apiClient } from "@/shared/lib/apiClient";

import type { LinkedOAuthAccount, OAuthProvider } from "../types";
import { linkedAccountsResponseSchema, oauthLinkConfirmResponseSchema } from "./oauthSchemas";

const OAUTH_BASE_PATH = "/auth/oauth";

export const buildOAuthStartUrl = (provider: OAuthProvider, redirectAfter: string): string => {
  const params = new URLSearchParams({ redirect: redirectAfter });
  return `/api${OAUTH_BASE_PATH}/${provider}/start?${params.toString()}`;
};

export const buildOAuthLinkStartUrl = (provider: OAuthProvider): string =>
  `/api${OAUTH_BASE_PATH}/${provider}/link/start`;

export type ConfirmOAuthLinkInput = {
  provider: OAuthProvider;
  linkToken: string;
  password: string;
};

export type ConfirmOAuthLinkResponse = { accessToken: string };

export const oauthApi = {
  async getLinkedAccounts(): Promise<LinkedOAuthAccount[]> {
    const res = await apiClient.get<{ accounts: LinkedOAuthAccount[] }>(
      `${OAUTH_BASE_PATH}/linked`,
    );
    return linkedAccountsResponseSchema.parse(res.data).accounts;
  },

  async confirmLink(input: ConfirmOAuthLinkInput): Promise<ConfirmOAuthLinkResponse> {
    const res = await apiClient.post<ConfirmOAuthLinkResponse>(
      `${OAUTH_BASE_PATH}/${input.provider}/link/confirm`,
      { linkToken: input.linkToken, password: input.password },
    );
    return oauthLinkConfirmResponseSchema.parse(res.data);
  },

  async unlink(provider: OAuthProvider, password?: string): Promise<void> {
    await apiClient.del(`${OAUTH_BASE_PATH}/${provider}/link`, {
      data: password ? { password } : {},
    });
  },
};
