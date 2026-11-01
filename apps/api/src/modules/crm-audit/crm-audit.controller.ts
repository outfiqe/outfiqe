import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { CSV_CONTENT_TYPE } from "#lib/csv-writer.utils.js";
import logger from "#lib/winston.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import type { ExportAuditQuery, ListAuditQuery } from "./crm-audit.schemas.js";
import { crmAudit } from "./crm-audit.service.js";

export const crmAuditController = {
  async list(_req: Request, res: Response) {
    const query = validated.query<ListAuditQuery>(res);
    const organization = getResolvedOrganization(res);

    const page = await crmAudit.list(organization.id, query);
    sendSuccess(res, page, "CRM audit log.");
  },

  async listFilterOptions(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    sendSuccess(res, await crmAudit.listFilterOptions(organization.id), "Audit filter choices.");
  },

  async exportLog(_req: Request, res: Response) {
    const filters = validated.query<ExportAuditQuery>(res);
    const organization = getResolvedOrganization(res);
    const { csv, rowCount } = await crmAudit.exportCsv(organization.id, filters);

    const exporterId = getAuthPrincipal(res)?.userId ?? "unknown";
    logger.info(`CRM audit export: org=${organization.id} exporter=${exporterId} rows=${rowCount}`);

    res
      .status(HTTP_STATUS.OK)
      .set("Content-Type", CSV_CONTENT_TYPE)
      .set("Content-Disposition", `attachment; filename="audit-log-${Date.now()}.csv"`)
      .send(csv);
  },
};
