import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  BrandApplicationIdParam,
  CreateBrandApplicationBody,
  ListBrandApplicationsQuery,
  RejectBrandApplicationBody,
} from "./brandApplication.schemas.js";
import { brandApplicationService } from "./brandApplication.service.js";

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

  async list(_req: Request, res: Response) {
    const query = validated.query<ListBrandApplicationsQuery>(res);
    const page = await brandApplicationService.list(query);

    sendSuccess(res, page, "Brand applications.");
  },

  async approve(_req: Request, res: Response) {
    const { id } = validated.params<BrandApplicationIdParam>(res);
    const principal = getAuthPrincipal(res);
    if (!principal) throw new Error("approve() reached without an auth principal");

    await brandApplicationService.approve(id, principal.userId);

    sendSuccess(res, null, "Application approved. Invite sent.");
  },

  async reject(_req: Request, res: Response) {
    const { id } = validated.params<BrandApplicationIdParam>(res);
    const { reason } = validated.body<RejectBrandApplicationBody>(res);
    const principal = getAuthPrincipal(res);
    if (!principal) throw new Error("reject() reached without an auth principal");

    await brandApplicationService.reject(id, principal.userId, reason);

    sendSuccess(res, null, "Application rejected.");
  },
};
