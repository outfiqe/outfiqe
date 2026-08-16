import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateExternalLinkBody,
  CreateInternalLinkBody,
  LinkTokenParam,
  ListMyLinksQuery,
  RecordLinkClickBody,
} from "./creatorLink.schemas.js";
import { creatorLinkService } from "./creatorLink.service.js";

const CREATED_STATUS = 201;

export const creatorLinkController = {
  async createInternal(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId } = validated.body<CreateInternalLinkBody>(res);
    const link = await creatorLinkService.createInternal(userId, productId);
    sendSuccess(res, link, "Link created.", CREATED_STATUS);
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

  async recordClick(_req: Request, res: Response) {
    const { token } = validated.params<LinkTokenParam>(res);
    const { sessionId } = validated.body<RecordLinkClickBody>(res);
    const principal = getAuthPrincipal(res);

    const result = await creatorLinkService.recordClick(token, sessionId, principal?.userId);
    sendSuccess(res, result, "Click recorded.");
  },
};
