import { type Request, type Response, Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { requireIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validate } from "#middlewares/validate.js";
import { requireFeatureFlag } from "#modules/feature-flags/feature-flags.middleware.js";
import { outfitIdParamSchema } from "#modules/outfits/outfit.schemas.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { OFFER_RATE_LIMITS } from "./outfit-offer.constants.js";
import { outfitOfferController } from "./outfit-offer.controller.js";
import {
  adminOfferActionSchema,
  listAdminOffersQuerySchema,
  listOffersQuerySchema,
  offerIdParamSchema,
  sendOfferSchema,
} from "./outfit-offer.schemas.js";

const perUserKey = (_req: Request, res: Response) => getAuthPrincipal(res)?.userId;

const sendOfferRateLimit = rateLimit({
  namespace: "outfit-offer-sends",
  ...OFFER_RATE_LIMITS.SEND,
  keyGenerator: perUserKey,
  message: "You've sent a lot of offers recently. Try again later.",
});

const respondRateLimit = rateLimit({
  namespace: "outfit-offer-responses",
  ...OFFER_RATE_LIMITS.RESPOND,
  keyGenerator: perUserKey,
  message: "You're doing that very quickly. Wait a moment and try again.",
});

const offerChain = [...requireActiveAuth, requireFeatureFlag("outfit_builder")];

const requireOfferRead = [
  ...requirePlatformRole("platform:commissions:read", "platform:commissions:manage"),
  requirePlatformNavItem("commissions"),
];
const requireOfferManage = [
  ...requirePlatformRole("platform:commissions:manage"),
  requirePlatformNavItem("commissions"),
];

export const outfitOfferRoutes = Router();

outfitOfferRoutes.get(
  "/admin",
  ...requireOfferRead,
  validate({ query: listAdminOffersQuerySchema }),
  outfitOfferController.listForAdmin,
);
outfitOfferRoutes.post(
  "/admin/:offerId/release",
  ...requireOfferManage,
  validate({ params: offerIdParamSchema, body: adminOfferActionSchema }),
  outfitOfferController.adminRelease,
);
outfitOfferRoutes.post(
  "/admin/:offerId/refund",
  ...requireOfferManage,
  validate({ params: offerIdParamSchema, body: adminOfferActionSchema }),
  outfitOfferController.adminRefund,
);
outfitOfferRoutes.post(
  "/admin/:offerId/mark-refunded",
  ...requireOfferManage,
  validate({ params: offerIdParamSchema, body: adminOfferActionSchema }),
  outfitOfferController.adminMarkRefunded,
);

outfitOfferRoutes.post(
  "/builds/:id",
  ...offerChain,
  requireIdempotencyKey,
  sendOfferRateLimit,
  validate({ params: outfitIdParamSchema, body: sendOfferSchema }),
  outfitOfferController.send,
);
outfitOfferRoutes.get(
  "/builds/:id",
  ...offerChain,
  validate({ params: outfitIdParamSchema }),
  outfitOfferController.listForBuild,
);
outfitOfferRoutes.get(
  "/sent",
  ...offerChain,
  validate({ query: listOffersQuerySchema }),
  outfitOfferController.listSent,
);
outfitOfferRoutes.get(
  "/received",
  ...offerChain,
  validate({ query: listOffersQuerySchema }),
  outfitOfferController.listReceived,
);
outfitOfferRoutes.get(
  "/:offerId",
  ...offerChain,
  validate({ params: offerIdParamSchema }),
  outfitOfferController.get,
);
outfitOfferRoutes.post(
  "/:offerId/payment",
  ...offerChain,
  sendOfferRateLimit,
  validate({ params: offerIdParamSchema }),
  outfitOfferController.retryPayment,
);
outfitOfferRoutes.post(
  "/:offerId/payment/verify",
  ...offerChain,
  respondRateLimit,
  validate({ params: offerIdParamSchema }),
  outfitOfferController.verifyPayment,
);
outfitOfferRoutes.post(
  "/:offerId/accept",
  ...offerChain,
  respondRateLimit,
  validate({ params: offerIdParamSchema }),
  outfitOfferController.accept,
);
outfitOfferRoutes.post(
  "/:offerId/decline",
  ...offerChain,
  respondRateLimit,
  validate({ params: offerIdParamSchema }),
  outfitOfferController.decline,
);
outfitOfferRoutes.post(
  "/:offerId/cancel",
  ...offerChain,
  respondRateLimit,
  validate({ params: offerIdParamSchema }),
  outfitOfferController.cancel,
);
