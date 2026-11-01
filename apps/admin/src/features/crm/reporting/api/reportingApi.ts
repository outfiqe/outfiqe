import { apiClient } from "@/lib/apiClient";

import {
  type CrmAttentionReport,
  crmAttentionReportSchema,
  type CrmOverviewReport,
  crmOverviewReportSchema,
  type CrmPeriodSummary,
  crmPeriodSummarySchema,
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

  async getOverviewReport(): Promise<CrmOverviewReport> {
    const res = await apiClient.get<CrmOverviewReport>("/crm/reports/overview");
    return crmOverviewReportSchema.parse(res.data);
  },

  async getPeriodSummary(period: { from: string; to: string }): Promise<CrmPeriodSummary> {
    const res = await apiClient.get<CrmPeriodSummary>("/crm/reports/summary", { params: period });
    return crmPeriodSummarySchema.parse(res.data);
  },

  async getAttentionReport(today: {
    dayStart: string;
    dayEnd: string;
  }): Promise<CrmAttentionReport> {
    const res = await apiClient.get<CrmAttentionReport>("/crm/reports/attention", {
      params: today,
    });
    return crmAttentionReportSchema.parse(res.data);
  },

  async search(query: string): Promise<CrmSearchResults> {
    const res = await apiClient.get<CrmSearchResults>("/crm/search", { params: { q: query } });
    return crmSearchResultsSchema.parse(res.data);
  },
};
