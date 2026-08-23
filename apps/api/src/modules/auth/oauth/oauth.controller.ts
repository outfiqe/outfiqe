import type { Request, Response } from "express";

import { env } from "#config/env.config.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { setRefreshCookie } from "#lib/cookie.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { describeError } from "#redis/redis.utils.js";

import { OAuthCallbackStatus } from "./oauth.constants.js";
import type {
  OAuthCallbackQuery,
  OAuthLinkConfirmBody,
  OAuthProviderParams,
  OAuthStartQuery,
  OAuthUnlinkBody,
} from "./oauth.schemas.js";
import { oauthService } from "./oauth.service.js";
import { sanitizeOAuthRedirectPath } from "./oauth.utils.js";

const OAUTH_CALLBACK_PAGE_PATH = "/auth/oauth-callback";
const OAUTH_LINK_CALLBACK_PAGE_PATH = "/dashboard/settings/security";
const OAUTH_GENERIC_FAILURE_CODE = "OAUTH_EXCHANGE_FAILED";
const OAUTH_ERROR_QUERY_KEY = "error";
const OAUTH_LINK_TOKEN_QUERY_KEY = "linkToken";
const OAUTH_EMAIL_QUERY_KEY = "email";
const OAUTH_PROVIDER_QUERY_KEY = "provider";
const OAUTH_LINKED_PROVIDER_QUERY_KEY = "linked";

const buildFrontendUrl = (path: string, searchParams: Record<string, string>): string => {
  const url = new URL(path, env.FRONTEND_URL);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
};

const redirectToCallbackPageWithError = (res: Response, errorCode: string): void => {
  res.redirect(buildFrontendUrl(OAUTH_CALLBACK_PAGE_PATH, { [OAUTH_ERROR_QUERY_KEY]: errorCode }));
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

  async linkStart(_req: Request, res: Response) {
    const { provider } = validated.params<OAuthProviderParams>(res);
    const { userId } = requireAuthPrincipal(res);

    const authorizationUrl = await oauthService.startOAuthLinkFlow(provider, userId);
    res.redirect(authorizationUrl);
  },

  async callback(_req: Request, res: Response) {
    const { provider } = validated.params<OAuthProviderParams>(res);
    const { code, state, error } = validated.query<OAuthCallbackQuery>(res);

    if (error || !code || !state) {
      redirectToCallbackPageWithError(res, OAUTH_GENERIC_FAILURE_CODE);
      return;
    }

    try {
      const outcome = await oauthService.handleOAuthCallback(provider, code, state);

      if (outcome.status === OAuthCallbackStatus.SIGNED_IN) {
        setRefreshCookie(res, outcome.tokens.refreshToken, outcome.tokens.refreshTokenTtlSeconds);
        res.redirect(buildFrontendUrl(outcome.redirectAfter, {}));
        return;
      }

      if (outcome.status === OAuthCallbackStatus.LINK_REQUIRED) {
        res.redirect(
          buildFrontendUrl(OAUTH_CALLBACK_PAGE_PATH, {
            [OAUTH_LINK_TOKEN_QUERY_KEY]: outcome.linkToken,
            [OAUTH_EMAIL_QUERY_KEY]: outcome.email,
            [OAUTH_PROVIDER_QUERY_KEY]: provider,
          }),
        );
        return;
      }

      res.redirect(
        buildFrontendUrl(OAUTH_LINK_CALLBACK_PAGE_PATH, {
          [OAUTH_LINKED_PROVIDER_QUERY_KEY]: outcome.provider,
        }),
      );
    } catch (caughtError) {
      const errorCode =
        caughtError instanceof AppError ? caughtError.code : OAUTH_GENERIC_FAILURE_CODE;
      logger.warn(`oauth.callback: ${describeError(caughtError)}`);
      redirectToCallbackPageWithError(res, errorCode);
    }
  },

  async confirmLink(_req: Request, res: Response) {
    const { provider } = validated.params<OAuthProviderParams>(res);
    const { linkToken, password } = validated.body<OAuthLinkConfirmBody>(res);

    const tokens = await oauthService.confirmOAuthLink(provider, linkToken, password);

    setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenTtlSeconds);
    sendSuccess(
      res,
      { accessToken: tokens.accessToken },
      "Account connected. You're now signed in.",
    );
  },

  async unlink(_req: Request, res: Response) {
    const { provider } = validated.params<OAuthProviderParams>(res);
    const { password } = validated.body<OAuthUnlinkBody>(res);
    const { userId } = requireAuthPrincipal(res);

    await oauthService.unlinkIdentity(userId, provider, password);
    sendSuccess(res, null, "Account disconnected.");
  },

  async linked(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);

    const accounts = await oauthService.listLinkedAccounts(userId);
    sendSuccess(res, { accounts }, "Linked accounts.");
  },
};
