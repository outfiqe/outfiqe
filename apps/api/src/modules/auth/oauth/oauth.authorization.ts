import { createHash, randomBytes } from "node:crypto";

import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import { GOOGLE_OAUTH_PROMPT, OAUTH_STATE_TTL_MS, OAuthProviderParam } from "./oauth.constants.js";
import type { OAuthProfile, OAuthStateRecord } from "./oauth.types.js";
import { exchangeFacebookAuthorizationCode } from "./providers/facebook.provider.js";
import { exchangeGoogleAuthorizationCode } from "./providers/google.provider.js";

const CODE_VERIFIER_BYTES = 48;

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
    ...(isGoogle ? { access_type: "online", prompt: GOOGLE_OAUTH_PROMPT } : {}),
  });

  return `${baseUrl}?${params.toString()}`;
};

export const startAuthorizationRequest = async (
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

export const consumeOAuthState = async (
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
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const stateRecord = JSON.parse(rawStateRecord) as OAuthStateRecord;
  if (stateRecord.provider !== provider) {
    throw new AppError(
      "OAUTH_STATE_INVALID",
      "This sign-in attempt is invalid. Please try again.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return stateRecord;
};

export const exchangeAndVerifyProfile = async (
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
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return profile;
};
