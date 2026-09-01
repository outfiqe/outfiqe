import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type { ListPlatformAuditQuery } from "./platform-audit.schemas.js";
import { platformAudit } from "./platform-audit.service.js";

export const platformAuditController = {
  async listAuditLogs(_req: Request, res: Response) {
    const { organizationId, actorUserId, action, cursor, limit } =
      validated.query<ListPlatformAuditQuery>(res);

    const page = await platformAudit.list({ organizationId, actorUserId, action, cursor, limit });
    sendSuccess(res, page, "Platform audit log.");
  },
};
