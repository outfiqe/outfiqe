import { apiClient } from "@/lib/apiClient";

import type { CrmSubjectTypeValue } from "../../activities/api/activitiesSchemas";
import { type CrmConnections, crmConnectionsSchema } from "./connectionsSchemas";

export type ConnectionSubject = {
  subjectType: CrmSubjectTypeValue | "ticket";
  subjectId: string;
};

export const crmConnectionsApi = {
  async getConnections(subject: ConnectionSubject): Promise<CrmConnections> {
    const res = await apiClient.get<CrmConnections>("/crm/connections", { params: subject });
    return crmConnectionsSchema.parse(res.data);
  },
};
