import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateExternalLinkBody,
  CreateInternalLinkBody,
  LinkIdParam,
  LinkTokenParam,
  ListMyLinksQuery,
  RecordLinkClickBody,
} from "./creator-link.schemas.js";
import { creatorLinkService } from "./creator-link.service.js";

export const creatorLinkController = {
  async createInternal(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId } = validated.body<CreateInternalLinkBody>(res);
    const link = await creatorLinkService.createInternal(userId, productId);
    sendSuccess(res, link, "Link created.", HTTP_STATUS.CREATED);
  },

  async getOrCreateExternal(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId } = validated.body<CreateExternalLinkBody>(res);
    const link = await creatorLinkService.getOrCreateExternal(userId, productId);
    sendSuccess(res, link, "Link ready.");
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListMyLinksQuery>(res);
    const page = await creatorLinkService.listMine(userId, query);
    sendSuccess(res, page, "Your links.");
  },

  async remove(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<LinkIdParam>(res);
    await creatorLinkService.deleteMine(userId, id);
    sendSuccess(res, null, "Link deleted.");
  },

  async recordClick(_req: Request, res: Response) {
    const { token } = validated.params<LinkTokenParam>(res);
    const { sessionId } = validated.body<RecordLinkClickBody>(res);
    const principal = getAuthPrincipal(res);

    const result = await creatorLinkService.recordClick(token, sessionId, principal?.userId);
    sendSuccess(res, result, "Click recorded.");
  },
};
