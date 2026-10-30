import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import { issueTokens } from "../../auth.tokens.js";
import { resolveLinkIdentity } from "../linking/linking.service.js";
import {
  consumeOAuthState,
  exchangeAndVerifyProfile,
  startAuthorizationRequest,
} from "../oauth.authorization.js";
import type { OAuthProviderParam } from "../oauth.constants.js";
import {
  OAUTH_STATE_TTL_MS,
  OAuthCallbackStatus,
  OAuthFlowIntent,
  PROVIDER_PARAM_TO_ENUM,
} from "../oauth.constants.js";
import { oauthRepository } from "../oauth.repository.js";
import type {
  OAuthIdentityResolution,
  OAuthLinkPendingRecord,
  OAuthProfile,
} from "../oauth.types.js";
import { sanitizeOAuthRedirectPath } from "../oauth.utils.js";

const OAUTH_LINK_PENDING_TTL_MS = OAUTH_STATE_TTL_MS;
const REDIS_EXPIRE_IN_MILLISECONDS = "PX";
const OAUTH_SIGNUP_METHOD = "oauth";

const signInExistingIdentity = async (
  userId: string,
  redirectAfter: string,
): Promise<OAuthIdentityResolution> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(
      "OAUTH_EXCHANGE_FAILED",
      "Could not sign you in. Please try again.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const tokens = await issueTokens(user);
  return { status: OAuthCallbackStatus.SIGNED_IN, tokens, redirectAfter };
};

const requestAccountLink = async (
  provider: OAuthProviderParam,
  profile: OAuthProfile,
  existingUserId: string,
): Promise<OAuthIdentityResolution> => {
  const linkToken = generateOpaqueToken();
  const pendingRecord: OAuthLinkPendingRecord = {
    userId: existingUserId,
    provider,
    providerUserId: profile.providerUserId,
    emailAtLinkTime: profile.email,
  };
  await redis.set(
    redisKeys.oauthLinkPending(linkToken),
    JSON.stringify(pendingRecord),
    REDIS_EXPIRE_IN_MILLISECONDS,
    OAUTH_LINK_PENDING_TTL_MS,
  );

  return { status: OAuthCallbackStatus.LINK_REQUIRED, linkToken, email: profile.email };
};

const createOAuthAccount = async (
  provider: OAuthProviderParam,
  profile: OAuthProfile,
  redirectAfter: string,
): Promise<OAuthIdentityResolution> => {
  const newUser = await userRepository.createOAuthOnlyUser({
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
  });

  await oauthRepository.createOAuthIdentity({
    userId: newUser.id,
    provider: PROVIDER_PARAM_TO_ENUM[provider],
    providerUserId: profile.providerUserId,
    emailAtLinkTime: profile.email,
  });

  await eventBus.publish(DomainEvents.USER_CREATED, {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    signupMethod: OAUTH_SIGNUP_METHOD,
  });

  const tokens = await issueTokens(newUser);
  return { status: OAuthCallbackStatus.SIGNED_IN, tokens, redirectAfter };
};

const resolveSignInIdentity = async (
  provider: OAuthProviderParam,
  profile: OAuthProfile,
  redirectAfter: string,
): Promise<OAuthIdentityResolution> => {
  const existingIdentity = await oauthRepository.findByProviderIdentity(
    PROVIDER_PARAM_TO_ENUM[provider],
    profile.providerUserId,
  );

  if (existingIdentity && !existingIdentity.revokedAt) {
    return signInExistingIdentity(existingIdentity.userId, redirectAfter);
  }

  const existingUserByEmail = await userRepository.findByEmail(profile.email);
  if (existingUserByEmail) return requestAccountLink(provider, profile, existingUserByEmail.id);

  if (existingIdentity?.revokedAt) {
    throw new AppError(
      "OAUTH_IDENTITY_ALREADY_LINKED",
      "This account was previously disconnected from Outfiqe. Please sign in with your password or contact support.",
      HTTP_STATUS.CONFLICT,
    );
  }

  return createOAuthAccount(provider, profile, redirectAfter);
};

export const oauthSignInService = {
  async startOAuthFlow(provider: OAuthProviderParam, redirectAfter: string): Promise<string> {
    const sanitizedRedirectAfter = sanitizeOAuthRedirectPath(redirectAfter);

    return startAuthorizationRequest(provider, (codeVerifier) => ({
      intent: OAuthFlowIntent.SIGN_IN,
      provider,
      codeVerifier,
      redirectAfter: sanitizedRedirectAfter,
    }));
  },

  async handleOAuthCallback(
    provider: OAuthProviderParam,
    code: string,
    state: string,
  ): Promise<OAuthIdentityResolution> {
    const stateRecord = await consumeOAuthState(provider, state);
    const profile = await exchangeAndVerifyProfile(provider, code, stateRecord.codeVerifier);

    if (stateRecord.intent === OAuthFlowIntent.LINK) {
      return resolveLinkIdentity(provider, profile, stateRecord.linkForUserId);
    }

    return resolveSignInIdentity(provider, profile, stateRecord.redirectAfter);
  },
};
