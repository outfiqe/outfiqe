import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import type { ListAuditQuery } from "./crm-audit.schemas.js";
import { crmAudit } from "./crm-audit.service.js";

export const crmAuditController = {
  async list(_req: Request, res: Response) {
    const { cursor, limit } = validated.query<ListAuditQuery>(res);
    const organization = getResolvedOrganization(res);

    const page = await crmAudit.list(organization.id, { cursor, limit });
    sendSuccess(res, page, "CRM audit log.");
  },
};
