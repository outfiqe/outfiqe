import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { RemovePushSubscriptionBody, SavePushSubscriptionBody } from "./push.schemas.js";
import { pushService } from "./push.service.js";

const NO_CONTENT_STATUS = 204;

export const pushController = {
  getPublicKey(_req: Request, res: Response) {
    sendSuccess(
      res,
      { publicKey: pushService.getVapidPublicKey() },
      "Push notification public key.",
    );
  },

  async saveSubscription(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<SavePushSubscriptionBody>(res);

    await pushService.saveSubscription(userId, body);
    sendSuccess(res, null, "Push subscription saved.");
  },

  async removeSubscription(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<RemovePushSubscriptionBody>(res);

    await pushService.removeSubscription(userId, body);
    res.status(NO_CONTENT_STATUS).end();
  },
};
