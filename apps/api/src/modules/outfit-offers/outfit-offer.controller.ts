import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { readRequiredIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validated } from "#middlewares/validate.js";
import type { OutfitIdParam } from "#modules/outfits/outfit.schemas.js";

import type {
  AdminOfferActionBody,
  ListAdminOffersQuery,
  ListOffersQuery,
  OfferIdParam,
  SendOfferBody,
} from "./outfit-offer.schemas.js";
import { outfitOfferService } from "./outfit-offer.service.js";

const CREATED_STATUS = 201;

export const outfitOfferController = {
  async send(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<SendOfferBody>(res);
    const sentOffer = await outfitOfferService.send(
      userId,
      id,
      body,
      readRequiredIdempotencyKey(req),
    );
    sendSuccess(res, sentOffer, "Offer created. Finish the payment to send it.", CREATED_STATUS);
  },

  async listForBuild(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    const offers = await outfitOfferService.listForBuild(userId, id);
    sendSuccess(res, offers, "Offers on this build.");
  },

  async listSent(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListOffersQuery>(res);
    const page = await outfitOfferService.listSent(userId, query);
    sendSuccess(res, page, "Offers you sent.");
  },

  async listReceived(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListOffersQuery>(res);
    const page = await outfitOfferService.listReceived(userId, query);
    sendSuccess(res, page, "Offers you received.");
  },

  async get(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const offer = await outfitOfferService.get(userId, offerId);
    sendSuccess(res, offer, "Offer.");
  },

  async retryPayment(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const sentOffer = await outfitOfferService.retryPayment(userId, offerId);
    sendSuccess(res, sentOffer, "Payment started.");
  },

  async verifyPayment(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const paymentCheck = await outfitOfferService.verifyPayment(userId, offerId);
    sendSuccess(res, paymentCheck, "Payment checked.");
  },

  async accept(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const offer = await outfitOfferService.accept(userId, offerId);
    sendSuccess(res, offer, "Offer accepted.");
  },

  async decline(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const offer = await outfitOfferService.decline(userId, offerId);
    sendSuccess(res, offer, "Offer declined. The brand is being refunded.");
  },

  async cancel(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const offer = await outfitOfferService.cancel(userId, offerId);
    sendSuccess(res, offer, "Offer cancelled. Your refund is on its way.");
  },

  async listForAdmin(_req: Request, res: Response) {
    const query = validated.query<ListAdminOffersQuery>(res);
    const page = await outfitOfferService.listForAdmin(query);
    sendSuccess(res, page, "Offers.");
  },

  async adminRelease(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const body = validated.body<AdminOfferActionBody>(res);
    const offer = await outfitOfferService.adminRelease(userId, offerId, body);
    sendSuccess(res, offer, "Offer released to the creator.");
  },

  async adminRefund(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const body = validated.body<AdminOfferActionBody>(res);
    const offer = await outfitOfferService.adminRefund(userId, offerId, body);
    sendSuccess(res, offer, "Offer refunded.");
  },

  async adminMarkRefunded(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { offerId } = validated.params<OfferIdParam>(res);
    const body = validated.body<AdminOfferActionBody>(res);
    const offer = await outfitOfferService.adminMarkRefunded(userId, offerId, body);
    sendSuccess(res, offer, "Refund recorded.");
  },
};
