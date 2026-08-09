import type { Request, Response } from "express";

import { adminInviteService } from "./adminInvite.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { getAuthPrincipal } from "../../shared/middlewares/require-auth.js";
import { validated } from "../../shared/middlewares/validate.js";

import type { CreateAdminInviteBody } from "./adminInvite.schemas.js";

const CREATED_STATUS = 201;

export const adminInviteController = {
  async create(_req: Request, res: Response) {
    const { email, name } = validated.body<CreateAdminInviteBody>(res);
    const principal = getAuthPrincipal(res);
    if (!principal) throw new Error("create() reached without an auth principal");

    await adminInviteService.invite(email, name, principal.userId);
    sendSuccess(res, null, "Invite sent.", CREATED_STATUS);
  },

  async list(_req: Request, res: Response) {
    const invites = await adminInviteService.list();
    sendSuccess(res, invites, "Admin invites.");
  },
};
