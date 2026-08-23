import { createHmac } from "node:crypto";

import { env } from "#config/env.config.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";

import type { OAuthCodeExchangeInput, OAuthProfile } from "../oauth.types.js";

const FACEBOOK_GRAPH_BASE_URL = "https://graph.facebook.com/v19.0";
const OAUTH_EXCHANGE_FAILED_STATUS = 400;
const OAUTH_EXCHANGE_FAILED_MESSAGE = "Could not complete Facebook sign-in. Please try again.";

type FacebookTokenResponse = { access_token: string };
type FacebookProfileResponse = {
  id: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
};

const computeAppSecretProof = (accessToken: string): string =>
  createHmac("sha256", env.FACEBOOK_APP_SECRET).update(accessToken).digest("hex");

export const exchangeFacebookAuthorizationCode = async ({
  code,
  codeVerifier,
  redirectUri,
}: OAuthCodeExchangeInput): Promise<OAuthProfile> => {
  try {
    const tokenUrl = new URL(`${FACEBOOK_GRAPH_BASE_URL}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", env.FACEBOOK_APP_ID);
    tokenUrl.searchParams.set("client_secret", env.FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    tokenUrl.searchParams.set("code_verifier", codeVerifier);

    const tokenResponse = await fetch(tokenUrl);
    if (!tokenResponse.ok) {
      throw new Error(`Facebook token exchange responded with status ${tokenResponse.status}`);
    }
    const { access_token: accessToken } = (await tokenResponse.json()) as FacebookTokenResponse;

    const profileUrl = new URL(`${FACEBOOK_GRAPH_BASE_URL}/me`);
    profileUrl.searchParams.set("fields", "id,name,email,picture");
    profileUrl.searchParams.set("access_token", accessToken);
    profileUrl.searchParams.set("appsecret_proof", computeAppSecretProof(accessToken));

    const profileResponse = await fetch(profileUrl);
    if (!profileResponse.ok) {
      throw new Error(`Facebook profile fetch responded with status ${profileResponse.status}`);
    }
    const profile = (await profileResponse.json()) as FacebookProfileResponse;

    if (!profile.email) {
      throw new Error("Facebook profile response did not include a verified email");
    }

    return {
      providerUserId: profile.id,
      email: profile.email,
      emailVerified: true,
      name: profile.name ?? profile.email,
      avatarUrl: profile.picture?.data?.url ?? null,
    };
  } catch (err) {
    logger.error(`Facebook OAuth exchange failed: ${describeError(err)}`);
    throw new AppError(
      "OAUTH_EXCHANGE_FAILED",
      OAUTH_EXCHANGE_FAILED_MESSAGE,
      OAUTH_EXCHANGE_FAILED_STATUS,
    );
  }
};
