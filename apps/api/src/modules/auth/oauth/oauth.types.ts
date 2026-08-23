import type { IssuedTokens } from "../auth.types.js";
import type { OAuthCallbackStatus, OAuthProviderParam } from "./oauth.constants.js";

export type OAuthProfile = {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
};

export type OAuthCodeExchangeInput = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

export type OAuthStateRecord = {
  provider: OAuthProviderParam;
  codeVerifier: string;
  redirectAfter: string;
};

export type OAuthLinkPendingRecord = {
  userId: string;
  provider: OAuthProviderParam;
  providerUserId: string;
  emailAtLinkTime: string;
};

export type OAuthIdentityResolution =
  | { status: OAuthCallbackStatus.SIGNED_IN; tokens: IssuedTokens }
  | { status: OAuthCallbackStatus.LINK_REQUIRED; linkToken: string; email: string };

export type OAuthCallbackResult = OAuthIdentityResolution & { redirectAfter: string };
