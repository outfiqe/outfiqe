import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateSizeStandardBody,
  SizeStandardIdParam,
  UpdateSizeStandardBody,
} from "./sizeStandard.schemas.js";
import { sizeStandardService } from "./sizeStandard.service.js";

const CREATED_STATUS = 201;

export const sizeStandardController = {
  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    sendSuccess(res, await sizeStandardService.listMine(userId), "Your size standards.");
  },

  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateSizeStandardBody>(res);
    const sizeStandard = await sizeStandardService.create(userId, body);
    sendSuccess(res, sizeStandard, "Size standard created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<SizeStandardIdParam>(res);
    const body = validated.body<UpdateSizeStandardBody>(res);
    sendSuccess(res, await sizeStandardService.update(userId, id, body), "Size standard updated.");
  },

  async archive(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<SizeStandardIdParam>(res);
    await sizeStandardService.archive(userId, id);
    sendSuccess(res, null, "Size standard archived.");
  },
};
