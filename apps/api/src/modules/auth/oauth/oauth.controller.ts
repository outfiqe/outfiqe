import type { Request, Response } from "express";

import { env } from "#config/env.config.js";
import { setRefreshCookie } from "#lib/cookie.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { validated } from "#middlewares/validate.js";
import { describeError } from "#redis/redis.utils.js";

import { OAuthCallbackStatus } from "./oauth.constants.js";
import type { OAuthCallbackQuery, OAuthProviderParams, OAuthStartQuery } from "./oauth.schemas.js";
import { oauthService } from "./oauth.service.js";
import { sanitizeOAuthRedirectPath } from "./oauth.utils.js";

const OAUTH_CALLBACK_PAGE_PATH = "/auth/oauth-callback";
const OAUTH_GENERIC_FAILURE_CODE = "OAUTH_EXCHANGE_FAILED";
const OAUTH_ERROR_QUERY_KEY = "error";
const OAUTH_LINK_TOKEN_QUERY_KEY = "linkToken";
const OAUTH_EMAIL_QUERY_KEY = "email";

const buildFrontendUrl = (path: string, searchParams: Record<string, string>): string => {
  const url = new URL(path, env.FRONTEND_URL);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
};

export const oauthController = {
  async start(_req: Request, res: Response) {
    const { provider } = validated.params<OAuthProviderParams>(res);
    const { redirect } = validated.query<OAuthStartQuery>(res);

    const authorizationUrl = await oauthService.startOAuthFlow(
      provider,
      sanitizeOAuthRedirectPath(redirect),
    );
    res.redirect(authorizationUrl);
  },

  async callback(_req: Request, res: Response) {
    const { provider } = validated.params<OAuthProviderParams>(res);
    const { code, state, error } = validated.query<OAuthCallbackQuery>(res);

    if (error || !code || !state) {
      res.redirect(
        buildFrontendUrl(OAUTH_CALLBACK_PAGE_PATH, {
          [OAUTH_ERROR_QUERY_KEY]: OAUTH_GENERIC_FAILURE_CODE,
        }),
      );
      return;
    }

    try {
      const outcome = await oauthService.handleOAuthCallback(provider, code, state);

      if (outcome.status === OAuthCallbackStatus.LINK_REQUIRED) {
        res.redirect(
          buildFrontendUrl(OAUTH_CALLBACK_PAGE_PATH, {
            [OAUTH_LINK_TOKEN_QUERY_KEY]: outcome.linkToken,
            [OAUTH_EMAIL_QUERY_KEY]: outcome.email,
          }),
        );
        return;
      }

      setRefreshCookie(res, outcome.tokens.refreshToken, outcome.tokens.refreshTokenTtlSeconds);
      res.redirect(buildFrontendUrl(outcome.redirectAfter, {}));
    } catch (caughtError) {
      const errorCode =
        caughtError instanceof AppError ? caughtError.code : OAUTH_GENERIC_FAILURE_CODE;
      logger.warn(`oauth.callback: ${describeError(caughtError)}`);
      res.redirect(
        buildFrontendUrl(OAUTH_CALLBACK_PAGE_PATH, { [OAUTH_ERROR_QUERY_KEY]: errorCode }),
      );
    }
  },
};
