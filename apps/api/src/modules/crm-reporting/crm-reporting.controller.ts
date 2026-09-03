import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import {
  getCrmMembership,
  getResolvedOrganization,
} from "#modules/crm-access/crm-access.middleware.js";

import type { CrmSearchQuery } from "./crm-reporting.schemas.js";
import { crmReportingService } from "./crm-reporting.service.js";

export const crmReportingController = {
  async getPipelineReport(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const report = await crmReportingService.getPipelineReport(organization.id);
    sendSuccess(res, report, "CRM pipeline report.");
  },

  async getTicketReport(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const report = await crmReportingService.getTicketReport(organization.id);
    sendSuccess(res, report, "CRM ticket report.");
  },

  async getOverviewReport(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const report = await crmReportingService.getOverviewReport(organization.id);
    sendSuccess(res, report, "CRM overview report.");
  },

  async search(_req: Request, res: Response) {
    const { q } = validated.query<CrmSearchQuery>(res);
    const organization = getResolvedOrganization(res);
    const membership = getCrmMembership(res);

    const results = await crmReportingService.search(
      organization,
      {
        isSuperAdmin: organization.superAdminMembershipId === membership.id,
        permissionKeys: membership.role.permissionKeys,
      },
      q,
    );
    sendSuccess(res, results, "CRM search results.");
  },
};
