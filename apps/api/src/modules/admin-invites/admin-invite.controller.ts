import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { CreateAdminInviteBody } from "./admin-invite.schemas.js";
import { adminInviteService } from "./admin-invite.service.js";

export const adminInviteController = {
  async create(_req: Request, res: Response) {
    const { email, name, roleId } = validated.body<CreateAdminInviteBody>(res);
    const principal = requireAuthPrincipal(res);

    await adminInviteService.invite(email, name, roleId, principal.userId);
    sendSuccess(res, null, "Invite sent.", HTTP_STATUS.CREATED);
  },

  async list(_req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);
    const result = await adminInviteService.list(principal.userId);
    sendSuccess(res, result, "Admin invites.");
  },
};
