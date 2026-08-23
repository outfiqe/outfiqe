import type { Request, Response } from "express";

import { env } from "#config/env.config.js";
import { OAuthProvider } from "#generated/prisma/enums.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { parseFacebookSignedRequest } from "./facebook.webhooks.utils.js";
import { oauthRepository } from "./oauth.repository.js";

const BAD_REQUEST_STATUS = 400;

const parseSignedRequestFromBody = (req: Request): { userId: string } => {
  const signedRequest =
    typeof req.body?.signed_request === "string" ? req.body.signed_request : undefined;
  const parsed = signedRequest ? parseFacebookSignedRequest(signedRequest) : null;

  if (!parsed) {
    throw new AppError("INVALID_SIGNED_REQUEST", "Invalid signed request.", BAD_REQUEST_STATUS);
  }

  return parsed;
};

const revokeFacebookIdentityIfPresent = async (providerUserId: string): Promise<void> => {
  const identity = await oauthRepository.findByProviderIdentity(
    OAuthProvider.FACEBOOK,
    providerUserId,
  );
  if (identity && !identity.revokedAt) {
    await oauthRepository.revokeOAuthIdentity(identity.id);
  }
};

export const facebookWebhooksController = {
  async deauthorize(req: Request, res: Response) {
    const { userId } = parseSignedRequestFromBody(req);
    await revokeFacebookIdentityIfPresent(userId);

    res.status(200).json({ success: true });
  },

  async dataDeletion(req: Request, res: Response) {
    const { userId } = parseSignedRequestFromBody(req);
    await revokeFacebookIdentityIfPresent(userId);

    res.status(200).json({
      url: env.FRONTEND_URL,
      confirmation_code: generateOpaqueToken(),
    });
  },
};
