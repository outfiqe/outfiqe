import { createHash, randomBytes } from "node:crypto";

import { env } from "#config/env.config.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { OAuthProvider } from "#generated/prisma/enums.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";
import { verifyPassword } from "#lib/password.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import { isLockedOut, recordFailedLogin, resetFailedLogins } from "../auth.lockout.utils.js";
import { issueTokens } from "../auth.service.js";
import type { IssuedTokens } from "../auth.types.js";
import {
  OAUTH_STATE_TTL_MS,
  OAuthCallbackStatus,
  OAuthFlowIntent,
  OAuthProviderParam,
} from "./oauth.constants.js";
import { oauthRepository } from "./oauth.repository.js";
import type {
  LinkedOAuthAccount,
  OAuthIdentityResolution,
  OAuthLinkPendingRecord,
  OAuthProfile,
  OAuthStateRecord,
} from "./oauth.types.js";
import { sanitizeOAuthRedirectPath } from "./oauth.utils.js";
import { exchangeFacebookAuthorizationCode } from "./providers/facebook.provider.js";
import { exchangeGoogleAuthorizationCode } from "./providers/google.provider.js";

const BAD_REQUEST_STATUS = 400;
const UNAUTHORIZED_STATUS = 401;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const CODE_VERIFIER_BYTES = 48;
const OAUTH_LINK_PENDING_TTL_MS = OAUTH_STATE_TTL_MS;

const PROVIDER_PARAM_TO_ENUM: Record<OAuthProviderParam, OAuthProvider> = {
  [OAuthProviderParam.GOOGLE]: OAuthProvider.GOOGLE,
  [OAuthProviderParam.FACEBOOK]: OAuthProvider.FACEBOOK,
};

const ENUM_TO_PROVIDER_PARAM: Record<OAuthProvider, OAuthProviderParam> = {
  [OAuthProvider.GOOGLE]: OAuthProviderParam.GOOGLE,
  [OAuthProvider.FACEBOOK]: OAuthProviderParam.FACEBOOK,
};

const PROVIDER_EXCHANGERS: Record<OAuthProviderParam, typeof exchangeGoogleAuthorizationCode> = {
  [OAuthProviderParam.GOOGLE]: exchangeGoogleAuthorizationCode,
  [OAuthProviderParam.FACEBOOK]: exchangeFacebookAuthorizationCode,
};

const PROVIDER_SCOPES: Record<OAuthProviderParam, string> = {
  [OAuthProviderParam.GOOGLE]: "openid email profile",
  [OAuthProviderParam.FACEBOOK]: "email public_profile",
};

const base64UrlEncode = (input: Buffer): string =>
  input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const generateCodeVerifier = (): string => base64UrlEncode(randomBytes(CODE_VERIFIER_BYTES));

const deriveCodeChallenge = (codeVerifier: string): string =>
  base64UrlEncode(createHash("sha256").update(codeVerifier).digest());

const buildRedirectUri = (provider: OAuthProviderParam): string =>
  `${env.OAUTH_REDIRECT_BASE_URL}/api/auth/oauth/${provider}/callback`;

const buildAuthorizationUrl = (
  provider: OAuthProviderParam,
  state: string,
  codeChallenge: string,
): string => {
  const redirectUri = buildRedirectUri(provider);
  const isGoogle = provider === OAuthProviderParam.GOOGLE;
  const baseUrl = isGoogle
    ? "https://accounts.google.com/o/oauth2/v2/auth"
    : "https://www.facebook.com/v19.0/dialog/oauth";

  const params = new URLSearchParams({
    client_id: isGoogle ? env.GOOGLE_CLIENT_ID : env.FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: PROVIDER_SCOPES[provider],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(isGoogle ? { access_type: "online" } : {}),
  });

  return `${baseUrl}?${params.toString()}`;
};

const startAuthorizationRequest = async (
  provider: OAuthProviderParam,
  buildStateRecord: (codeVerifier: string) => OAuthStateRecord,
): Promise<string> => {
  const state = generateOpaqueToken();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = deriveCodeChallenge(codeVerifier);
  const stateRecord = buildStateRecord(codeVerifier);

  await redis.set(
    redisKeys.oauthState(state),
    JSON.stringify(stateRecord),
    "PX",
    OAUTH_STATE_TTL_MS,
  );

  return buildAuthorizationUrl(provider, state, codeChallenge);
};

const consumeOAuthState = async (
  provider: OAuthProviderParam,
  state: string,
): Promise<OAuthStateRecord> => {
  const stateKey = redisKeys.oauthState(state);
  const rawStateRecord = await redis.get(stateKey);
  await redis.del(stateKey);

  if (!rawStateRecord) {
    throw new AppError(
      "OAUTH_STATE_INVALID",
      "This sign-in attempt has expired or was already used. Please try again.",
      BAD_REQUEST_STATUS,
    );
  }

  const stateRecord = JSON.parse(rawStateRecord) as OAuthStateRecord;
  if (stateRecord.provider !== provider) {
    throw new AppError(
      "OAUTH_STATE_INVALID",
      "This sign-in attempt is invalid. Please try again.",
      BAD_REQUEST_STATUS,
    );
  }

  return stateRecord;
};

const exchangeAndVerifyProfile = async (
  provider: OAuthProviderParam,
  code: string,
  codeVerifier: string,
): Promise<OAuthProfile> => {
  const profile = await PROVIDER_EXCHANGERS[provider]({
    code,
    codeVerifier,
    redirectUri: buildRedirectUri(provider),
  });

  if (!profile.emailVerified || !profile.email) {
    throw new AppError(
      "OAUTH_EMAIL_UNVERIFIED",
      "Your account's email isn't verified with this provider. Please verify it and try again.",
      BAD_REQUEST_STATUS,
    );
  }

  return profile;
};

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
      CONFLICT_STATUS,
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

const resolveSignInIdentity = async (
  provider: OAuthProviderParam,
  profile: OAuthProfile,
  redirectAfter: string,
): Promise<OAuthIdentityResolution> => {
  const providerEnum = PROVIDER_PARAM_TO_ENUM[provider];
  const existingIdentity = await oauthRepository.findByProviderIdentity(
    providerEnum,
    profile.providerUserId,
  );

  if (existingIdentity && !existingIdentity.revokedAt) {
    const user = await userRepository.findById(existingIdentity.userId);
    if (!user) {
      throw new AppError(
        "OAUTH_EXCHANGE_FAILED",
        "Could not sign you in. Please try again.",
        BAD_REQUEST_STATUS,
      );
    }

    const tokens = await issueTokens(user);
    return { status: OAuthCallbackStatus.SIGNED_IN, tokens, redirectAfter };
  }

  const existingUserByEmail = await userRepository.findByEmail(profile.email);
  if (existingUserByEmail) {
    const linkToken = generateOpaqueToken();
    const pendingRecord: OAuthLinkPendingRecord = {
      userId: existingUserByEmail.id,
      provider,
      providerUserId: profile.providerUserId,
      emailAtLinkTime: profile.email,
    };
    await redis.set(
      redisKeys.oauthLinkPending(linkToken),
      JSON.stringify(pendingRecord),
      "PX",
      OAUTH_LINK_PENDING_TTL_MS,
    );

    return { status: OAuthCallbackStatus.LINK_REQUIRED, linkToken, email: profile.email };
  }

  if (existingIdentity?.revokedAt) {
    throw new AppError(
      "OAUTH_IDENTITY_ALREADY_LINKED",
      "This account was previously disconnected from Outfiqe. Please sign in with your password or contact support.",
      CONFLICT_STATUS,
    );
  }

  const newUser = await userRepository.createOAuthOnlyUser({
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
  });

  await oauthRepository.createOAuthIdentity({
    userId: newUser.id,
    provider: providerEnum,
    providerUserId: profile.providerUserId,
    emailAtLinkTime: profile.email,
  });

  await eventBus.publish(DomainEvents.USER_CREATED, {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  const tokens = await issueTokens(newUser);
  return { status: OAuthCallbackStatus.SIGNED_IN, tokens, redirectAfter };
};

const resolveLinkIdentity = async (
  provider: OAuthProviderParam,
  profile: OAuthProfile,
  linkForUserId: string,
): Promise<OAuthIdentityResolution> => {
  const user = await userRepository.findById(linkForUserId);
  if (!user) {
    throw new AppError(
      "OAUTH_EXCHANGE_FAILED",
      "Could not connect this account. Please try again.",
      BAD_REQUEST_STATUS,
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

export const oauthService = {
  async startOAuthFlow(provider: OAuthProviderParam, redirectAfter: string): Promise<string> {
    const sanitizedRedirectAfter = sanitizeOAuthRedirectPath(redirectAfter);

    return startAuthorizationRequest(provider, (codeVerifier) => ({
      intent: OAuthFlowIntent.SIGN_IN,
      provider,
      codeVerifier,
      redirectAfter: sanitizedRedirectAfter,
    }));
  },

  async startOAuthLinkFlow(provider: OAuthProviderParam, linkForUserId: string): Promise<string> {
    return startAuthorizationRequest(provider, (codeVerifier) => ({
      intent: OAuthFlowIntent.LINK,
      provider,
      codeVerifier,
      linkForUserId,
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
        BAD_REQUEST_STATUS,
      );
    }

    const pendingRecord = JSON.parse(rawPendingRecord) as OAuthLinkPendingRecord;
    if (pendingRecord.provider !== provider) {
      throw new AppError(
        "OAUTH_LINK_TOKEN_INVALID",
        "This link confirmation is invalid. Please try connecting again.",
        BAD_REQUEST_STATUS,
      );
    }

    const user = await userRepository.findById(pendingRecord.userId);
    if (!user) {
      throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", UNAUTHORIZED_STATUS);
    }

    if (await isLockedOut(user.email)) {
      throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", UNAUTHORIZED_STATUS);
    }

    const isPasswordValid = user.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!isPasswordValid) {
      await recordFailedLogin(user.email);
      throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", UNAUTHORIZED_STATUS);
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
      throw new AppError("UNAUTHORIZED", "Authentication required.", UNAUTHORIZED_STATUS);
    }

    if (user.passwordHash) {
      const isPasswordValid = password ? await verifyPassword(password, user.passwordHash) : false;
      if (!isPasswordValid) {
        throw new AppError("INVALID_CREDENTIALS", "Incorrect password.", UNAUTHORIZED_STATUS);
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
        NOT_FOUND_STATUS,
      );
    }

    const activeIdentities = await oauthRepository.findActiveOAuthIdentitiesForUser(userId);
    const wouldLeaveZeroAuthMethods = !user.passwordHash && activeIdentities.length <= 1;
    if (wouldLeaveZeroAuthMethods) {
      throw new AppError(
        "ONLY_AUTH_METHOD",
        "Connect another sign-in method before disconnecting this one.",
        CONFLICT_STATUS,
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
