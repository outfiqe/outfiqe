import { createHash, randomBytes } from "node:crypto";

import { env } from "#config/env.config.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { OAuthProvider } from "#generated/prisma/enums.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import { issueTokens } from "../auth.service.js";
import { OAUTH_STATE_TTL_MS, OAuthCallbackStatus, OAuthProviderParam } from "./oauth.constants.js";
import { oauthRepository } from "./oauth.repository.js";
import type {
  OAuthCallbackResult,
  OAuthIdentityResolution,
  OAuthLinkPendingRecord,
  OAuthProfile,
  OAuthStateRecord,
} from "./oauth.types.js";
import { sanitizeOAuthRedirectPath } from "./oauth.utils.js";
import { exchangeFacebookAuthorizationCode } from "./providers/facebook.provider.js";
import { exchangeGoogleAuthorizationCode } from "./providers/google.provider.js";

const BAD_REQUEST_STATUS = 400;
const CODE_VERIFIER_BYTES = 48;
const OAUTH_LINK_PENDING_TTL_MS = OAUTH_STATE_TTL_MS;

const PROVIDER_PARAM_TO_ENUM: Record<OAuthProviderParam, OAuthProvider> = {
  [OAuthProviderParam.GOOGLE]: OAuthProvider.GOOGLE,
  [OAuthProviderParam.FACEBOOK]: OAuthProvider.FACEBOOK,
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

const resolveOAuthIdentity = async (
  provider: OAuthProviderParam,
  profile: OAuthProfile,
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
    return { status: OAuthCallbackStatus.SIGNED_IN, tokens };
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
  return { status: OAuthCallbackStatus.SIGNED_IN, tokens };
};

export const oauthService = {
  async startOAuthFlow(provider: OAuthProviderParam, redirectAfter: string): Promise<string> {
    const state = generateOpaqueToken();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(codeVerifier);

    const stateRecord: OAuthStateRecord = {
      provider,
      codeVerifier,
      redirectAfter: sanitizeOAuthRedirectPath(redirectAfter),
    };
    await redis.set(
      redisKeys.oauthState(state),
      JSON.stringify(stateRecord),
      "PX",
      OAUTH_STATE_TTL_MS,
    );

    return buildAuthorizationUrl(provider, state, codeChallenge);
  },

  async handleOAuthCallback(
    provider: OAuthProviderParam,
    code: string,
    state: string,
  ): Promise<OAuthCallbackResult> {
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

    const profile = await PROVIDER_EXCHANGERS[provider]({
      code,
      codeVerifier: stateRecord.codeVerifier,
      redirectUri: buildRedirectUri(provider),
    });

    if (!profile.emailVerified || !profile.email) {
      throw new AppError(
        "OAUTH_EMAIL_UNVERIFIED",
        "Your account's email isn't verified with this provider. Please verify it and try again.",
        BAD_REQUEST_STATUS,
      );
    }

    const outcome = await resolveOAuthIdentity(provider, profile);
    return { ...outcome, redirectAfter: stateRecord.redirectAfter };
  },
};
