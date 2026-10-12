import { HTTP_STATUS } from "#constants/http.constants.js";
import type { OAuthProvider } from "#generated/prisma/enums.js";
import { verifyPassword } from "#lib/password.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import { isLockedOut, recordFailedLogin, resetFailedLogins } from "../../auth.lockout.utils.js";
import { issueTokens } from "../../auth.tokens.js";
import type { IssuedTokens } from "../../auth.types.js";
import { startAuthorizationRequest } from "../oauth.authorization.js";
import type { OAuthProviderParam } from "../oauth.constants.js";
import {
  ENUM_TO_PROVIDER_PARAM,
  OAuthCallbackStatus,
  OAuthFlowIntent,
  PROVIDER_PARAM_TO_ENUM,
} from "../oauth.constants.js";
import { oauthRepository } from "../oauth.repository.js";
import type {
  LinkedOAuthAccount,
  OAuthIdentityResolution,
  OAuthLinkPendingRecord,
  OAuthProfile,
} from "../oauth.types.js";

const createOrReviveOAuthIdentity = async (
  userId: string,
  providerEnum: OAuthProvider,
  providerUserId: string,
  emailAtLinkTime: string,
): Promise<void> => {
  const existingIdentity = await oauthRepository.findByProviderIdentity(
    providerEnum,
    providerUserId,
  );

  if (existingIdentity && existingIdentity.userId !== userId) {
    throw new AppError(
      "OAUTH_IDENTITY_ALREADY_LINKED",
      "This account is already connected to a different Outfiqe account.",
      HTTP_STATUS.CONFLICT,
    );
  }

  if (existingIdentity) {
    await oauthRepository.reviveOAuthIdentity(existingIdentity.id, emailAtLinkTime);
    return;
  }

  await oauthRepository.createOAuthIdentity({
    userId,
    provider: providerEnum,
    providerUserId,
    emailAtLinkTime,
  });
};

export const resolveLinkIdentity = async (
  provider: OAuthProviderParam,
  profile: OAuthProfile,
  linkForUserId: string,
): Promise<OAuthIdentityResolution> => {
  const user = await userRepository.findById(linkForUserId);
  if (!user) {
    throw new AppError(
      "OAUTH_EXCHANGE_FAILED",
      "Could not connect this account. Please try again.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  await createOrReviveOAuthIdentity(
    user.id,
    PROVIDER_PARAM_TO_ENUM[provider],
    profile.providerUserId,
    profile.email,
  );

  return { status: OAuthCallbackStatus.LINK_COMPLETED, provider };
};

export const oauthLinkingService = {
  async startOAuthLinkFlow(provider: OAuthProviderParam, linkForUserId: string): Promise<string> {
    return startAuthorizationRequest(provider, (codeVerifier) => ({
      intent: OAuthFlowIntent.LINK,
      provider,
      codeVerifier,
      linkForUserId,
    }));
  },

  async confirmOAuthLink(
    provider: OAuthProviderParam,
    linkToken: string,
    password: string,
  ): Promise<IssuedTokens> {
    const pendingKey = redisKeys.oauthLinkPending(linkToken);
    const rawPendingRecord = await redis.get(pendingKey);

    if (!rawPendingRecord) {
      throw new AppError(
        "OAUTH_LINK_TOKEN_INVALID",
        "This link confirmation has expired. Please try connecting again.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const pendingRecord = JSON.parse(rawPendingRecord) as OAuthLinkPendingRecord;
    if (pendingRecord.provider !== provider) {
      throw new AppError(
        "OAUTH_LINK_TOKEN_INVALID",
        "This link confirmation is invalid. Please try connecting again.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const user = await userRepository.findById(pendingRecord.userId);
    if (!user) {
      throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", HTTP_STATUS.UNAUTHORIZED);
    }

    if (await isLockedOut(user.email)) {
      throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", HTTP_STATUS.UNAUTHORIZED);
    }

    const isPasswordValid = user.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!isPasswordValid) {
      await recordFailedLogin(user.email);
      throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", HTTP_STATUS.UNAUTHORIZED);
    }

    await resetFailedLogins(user.email);
    await redis.del(pendingKey);

    await createOrReviveOAuthIdentity(
      user.id,
      PROVIDER_PARAM_TO_ENUM[provider],
      pendingRecord.providerUserId,
      pendingRecord.emailAtLinkTime,
    );

    return issueTokens(user);
  },

  async unlinkIdentity(
    userId: string,
    provider: OAuthProviderParam,
    password: string | undefined,
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("UNAUTHORIZED", "Authentication required.", HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.passwordHash) {
      const isPasswordValid = password ? await verifyPassword(password, user.passwordHash) : false;
      if (!isPasswordValid) {
        throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", HTTP_STATUS.UNAUTHORIZED);
      }
    }

    const providerEnum = PROVIDER_PARAM_TO_ENUM[provider];
    const identity = await oauthRepository.findActiveIdentityForUserAndProvider(
      userId,
      providerEnum,
    );
    if (!identity) {
      throw new AppError(
        "OAUTH_IDENTITY_NOT_FOUND",
        "This provider isn't connected to your account.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const activeIdentities = await oauthRepository.findActiveOAuthIdentitiesForUser(userId);
    const wouldLeaveZeroAuthMethods = !user.passwordHash && activeIdentities.length <= 1;
    if (wouldLeaveZeroAuthMethods) {
      throw new AppError(
        "ONLY_AUTH_METHOD",
        "Connect another sign-in method before disconnecting this one.",
        HTTP_STATUS.CONFLICT,
      );
    }

    await oauthRepository.revokeOAuthIdentity(identity.id);
  },

  async listLinkedAccounts(userId: string): Promise<LinkedOAuthAccount[]> {
    const identities = await oauthRepository.findActiveOAuthIdentitiesForUser(userId);
    return identities.map((identity) => ({
      provider: ENUM_TO_PROVIDER_PARAM[identity.provider],
      emailAtLinkTime: identity.emailAtLinkTime,
      connectedAt: identity.createdAt.toISOString(),
    }));
  },
};
