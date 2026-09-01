import { z } from "zod";

import { MAX_TENANTS_PAGE_SIZE } from "./platform-metrics.constants.js";

export const listTenantsQuerySchema = z.object({
  plan: z.string().trim().min(1).max(40).optional(),
  sort: z.enum(["recent-activity", "name", "created"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_TENANTS_PAGE_SIZE).optional(),
});

export const tenantIdParamsSchema = z.object({ orgId: z.uuid() });

export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>;
