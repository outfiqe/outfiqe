import { apiClient } from "@/lib/apiClient";

import { type CrmAuditPage, crmAuditPageSchema } from "./auditSchemas";

export const crmAuditApi = {
  async list(cursor?: string): Promise<CrmAuditPage> {
    const res = await apiClient.get<CrmAuditPage>("/crm/audit", {
      params: cursor ? { cursor } : undefined,
    });
    return crmAuditPageSchema.parse(res.data);
  },
};
