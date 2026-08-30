import { apiClient } from "@/lib/apiClient";

import {
  type CrmSearchResults,
  crmSearchResultsSchema,
  type PipelineReport,
  pipelineReportSchema,
  type TicketReport,
  ticketReportSchema,
} from "./reportingSchemas";

export const crmReportingApi = {
  async getPipelineReport(): Promise<PipelineReport> {
    const res = await apiClient.get<PipelineReport>("/crm/reports/pipeline");
    return pipelineReportSchema.parse(res.data);
  },

  async getTicketReport(): Promise<TicketReport> {
    const res = await apiClient.get<TicketReport>("/crm/reports/tickets");
    return ticketReportSchema.parse(res.data);
  },

  async search(query: string): Promise<CrmSearchResults> {
    const res = await apiClient.get<CrmSearchResults>("/crm/search", { params: { q: query } });
    return crmSearchResultsSchema.parse(res.data);
  },
};
