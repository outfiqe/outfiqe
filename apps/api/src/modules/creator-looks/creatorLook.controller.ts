import type { Request, Response } from "express";

import { creatorLookService } from "./creatorLook.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { getAuthPrincipal } from "../../shared/middlewares/require-auth.js";
import { validated } from "../../shared/middlewares/validate.js";

import type { AuthPrincipal } from "#types/token.types.js";
import type { CreateCreatorLookBody, ListCreatorLooksQuery } from "./creatorLook.schemas.js";

const CREATED_STATUS = 201;

const requirePrincipal = (res: Response): AuthPrincipal => {
  const principal = getAuthPrincipal(res);
  if (!principal) throw new Error("reached without an auth principal");
  return principal;
};

export const creatorLookController = {
  async create(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const body = validated.body<CreateCreatorLookBody>(res);

    const look = await creatorLookService.create(userId, body);
    sendSuccess(res, look, "Look posted.", CREATED_STATUS);
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const looks = await creatorLookService.listMine(userId);

    sendSuccess(res, looks, "Your looks.");
  },

  async listFeatured(_req: Request, res: Response) {
    const query = validated.query<ListCreatorLooksQuery>(res);
    const page = await creatorLookService.listPublic(query);
    sendSuccess(res, page, "Creator looks.");
  },
};
