import { apiClient } from "@/lib/apiClient";

import {
  type CrmAuditFilterOptions,
  crmAuditFilterOptionsSchema,
  type CrmAuditPage,
  crmAuditPageSchema,
} from "./auditSchemas";

export type CrmAuditFilters = {
  action?: string;
  group?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
};

const toExportParams = (filters: CrmAuditFilters) =>
  new URLSearchParams(Object.entries(filters).filter(([, filterValue]) => Boolean(filterValue)));

export const crmAuditApi = {
  async list(filters: CrmAuditFilters, cursor?: string): Promise<CrmAuditPage> {
    const res = await apiClient.get<CrmAuditPage>("/crm/audit", {
      params: { ...filters, ...(cursor ? { cursor } : {}) },
    });
    return crmAuditPageSchema.parse(res.data);
  },

  async listFilterOptions(): Promise<CrmAuditFilterOptions> {
    const res = await apiClient.get<CrmAuditFilterOptions>("/crm/audit/filters");
    return crmAuditFilterOptionsSchema.parse(res.data);
  },

  exportLog(filters: CrmAuditFilters): Promise<Blob> {
    return apiClient.getBlob(`/crm/audit/export?${toExportParams(filters)}`);
  },
};
