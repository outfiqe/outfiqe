import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { CreateAdminInviteBody } from "./adminInvite.schemas.js";
import { adminInviteService } from "./adminInvite.service.js";

const CREATED_STATUS = 201;

export const adminInviteController = {
  async create(_req: Request, res: Response) {
    const { email, name } = validated.body<CreateAdminInviteBody>(res);
    const principal = requireAuthPrincipal(res);

    await adminInviteService.invite(email, name, principal.userId);
    sendSuccess(res, null, "Invite sent.", CREATED_STATUS);
  },

  async list(_req: Request, res: Response) {
    const invites = await adminInviteService.list();
    sendSuccess(res, invites, "Admin invites.");
  },
};
