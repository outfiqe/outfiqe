import type { Request, Response } from "express";

import { brandApplicationService } from "./brandApplication.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { validated } from "../../shared/middlewares/validate.js";

import type { CreateBrandApplicationBody } from "./brandApplication.schemas.js";

const CREATED_STATUS = 201;

export const brandApplicationController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateBrandApplicationBody>(res);
    await brandApplicationService.submit(body);

    sendSuccess(
      res,
      null,
      "Application received. We'll be in touch within a week.",
      CREATED_STATUS,
    );
  },
};
