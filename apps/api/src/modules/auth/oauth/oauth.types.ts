import type { IssuedTokens } from "../auth.types.js";
import type {
  OAuthCallbackStatus,
  OAuthFlowIntent,
  OAuthProviderParam,
} from "./oauth.constants.js";

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

export type OAuthStateRecord =
  | {
      intent: OAuthFlowIntent.SIGN_IN;
      provider: OAuthProviderParam;
      codeVerifier: string;
      redirectAfter: string;
    }
  | {
      intent: OAuthFlowIntent.LINK;
      provider: OAuthProviderParam;
      codeVerifier: string;
      linkForUserId: string;
    };

export type OAuthLinkPendingRecord = {
  userId: string;
  provider: OAuthProviderParam;
  providerUserId: string;
  emailAtLinkTime: string;
};

export type LinkedOAuthAccount = {
  provider: OAuthProviderParam;
  emailAtLinkTime: string;
  connectedAt: string;
};

export type OAuthIdentityResolution =
  | { status: OAuthCallbackStatus.SIGNED_IN; tokens: IssuedTokens; redirectAfter: string }
  | { status: OAuthCallbackStatus.LINK_REQUIRED; linkToken: string; email: string }
  | { status: OAuthCallbackStatus.LINK_COMPLETED; provider: OAuthProviderParam };
