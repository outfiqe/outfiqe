import { z } from "zod";

import { MAX_TENANT_SEARCH_LENGTH, MAX_TENANTS_PAGE_SIZE } from "./platform-metrics.constants.js";

export const listTenantsQuerySchema = z.object({
  plan: z.string().trim().min(1).max(40).optional(),
  search: z.string().trim().min(1).max(MAX_TENANT_SEARCH_LENGTH).optional(),
  sort: z
    .enum([
      "recent-activity",
      "name",
      "created",
      "members",
      "contacts",
      "deals",
      "tickets",
      "activities",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_TENANTS_PAGE_SIZE).optional(),
});

export const tenantIdParamsSchema = z.object({ orgId: z.uuid() });

export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>;
