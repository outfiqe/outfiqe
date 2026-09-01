import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type { ListTenantsQuery, TenantIdParams } from "./platform-metrics.schemas.js";
import { platformMetricsService } from "./platform-metrics.service.js";

export const platformMetricsController = {
  async overview(_req: Request, res: Response) {
    sendSuccess(res, await platformMetricsService.overview(), "Platform overview.");
  },

  async listTenants(_req: Request, res: Response) {
    const query = validated.query<ListTenantsQuery>(res);
    sendSuccess(res, await platformMetricsService.listTenants(query), "Tenant metrics.");
  },

  async tenantDetail(_req: Request, res: Response) {
    const { orgId } = validated.params<TenantIdParams>(res);
    sendSuccess(res, await platformMetricsService.tenantDetail(orgId), "Tenant metric detail.");
  },
};
