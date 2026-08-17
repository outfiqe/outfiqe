import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateSizeOptionBody,
  ListSizeOptionsQuery,
  SizeOptionIdParam,
} from "./size-option.schemas.js";
import { sizeOptionService } from "./size-option.service.js";

const CREATED_STATUS = 201;

export const sizeOptionController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateSizeOptionBody>(res);
    const sizeOption = await sizeOptionService.create(body);
    sendSuccess(res, sizeOption, "Size created.", CREATED_STATUS);
  },

  async delete(_req: Request, res: Response) {
    const { id } = validated.params<SizeOptionIdParam>(res);
    await sizeOptionService.delete(id);
    sendSuccess(res, null, "Size deleted.");
  },

  async listAll(_req: Request, res: Response) {
    const sizeOptions = await sizeOptionService.listAll();
    sendSuccess(res, sizeOptions, "Sizes.");
  },

  async listByType(_req: Request, res: Response) {
    const { type } = validated.query<ListSizeOptionsQuery>(res);
    const sizeOptions = await sizeOptionService.listByType(type);
    sendSuccess(res, sizeOptions, "Sizes.");
  },
};
