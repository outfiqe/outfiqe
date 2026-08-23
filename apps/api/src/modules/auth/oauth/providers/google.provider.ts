import { OAuth2Client } from "google-auth-library";

import { env } from "#config/env.config.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";

import type { OAuthCodeExchangeInput, OAuthProfile } from "../oauth.types.js";

const OAUTH_EXCHANGE_FAILED_STATUS = 400;
const OAUTH_EXCHANGE_FAILED_MESSAGE = "Could not complete Google sign-in. Please try again.";

const createGoogleOAuthClient = (): OAuth2Client =>
  new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

export const exchangeGoogleAuthorizationCode = async ({
  code,
  codeVerifier,
  redirectUri,
}: OAuthCodeExchangeInput): Promise<OAuthProfile> => {
  const client = createGoogleOAuthClient();

  try {
    const { tokens } = await client.getToken({
      code,
      codeVerifier,
      redirect_uri: redirectUri,
    });

    if (!tokens.id_token) {
      throw new Error("Google token exchange did not return an id_token");
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("Google id_token verification returned no payload");
    }

    return {
      providerUserId: payload.sub,
      email: payload.email ?? "",
      emailVerified: payload.email_verified === true,
      name: payload.name ?? payload.email ?? "Google User",
      avatarUrl: payload.picture ?? null,
    };
  } catch (err) {
    logger.error(`Google OAuth exchange failed: ${describeError(err)}`);
    throw new AppError(
      "OAUTH_EXCHANGE_FAILED",
      OAUTH_EXCHANGE_FAILED_MESSAGE,
      OAUTH_EXCHANGE_FAILED_STATUS,
    );
  }
};
