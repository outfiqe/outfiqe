import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type SupportAgent,
  supportAgentSchema,
  type SupportInboxFilters,
  type SupportInboxStats,
  supportInboxStatsSchema,
  type SupportPriorityValue,
  type SupportStatusValue,
  type SupportTicketPage,
  supportTicketPageSchema,
  type SupportTicketWithThread,
  supportTicketWithThreadSchema,
  type SupportVisibilityValue,
} from "./schemas";

const toQuery = (filters: SupportInboxFilters, cursor?: string): string => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.segment) params.set("segment", filters.segment);
  if (filters.assigneeUserId) params.set("assigneeUserId", filters.assigneeUserId);
  if (filters.unassigned) params.set("unassigned", "true");
  if (filters.search) params.set("search", filters.search);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const supportApi = {
  async list(filters: SupportInboxFilters, cursor?: string): Promise<SupportTicketPage> {
    const res = await apiClient.get<SupportTicketPage>(
      `/support/admin/tickets${toQuery(filters, cursor)}`,
    );
    return supportTicketPageSchema.parse(res.data);
  },

  async get(id: string): Promise<SupportTicketWithThread> {
    const res = await apiClient.get<SupportTicketWithThread>(`/support/admin/tickets/${id}`);
    return supportTicketWithThreadSchema.parse(res.data);
  },

  async reply(
    id: string,
    input: {
      body: string;
      visibility: SupportVisibilityValue;
      attachmentUrls?: string[];
      moveToWaitingOnCustomer?: boolean;
    },
  ): Promise<SupportTicketWithThread> {
    const res = await apiClient.post<SupportTicketWithThread>(
      `/support/admin/tickets/${id}/messages`,
      { attachmentUrls: [], ...input },
    );
    return supportTicketWithThreadSchema.parse(res.data);
  },

  async setStatus(
    id: string,
    status: SupportStatusValue,
    expectedStatus: SupportStatusValue,
  ): Promise<SupportTicketWithThread> {
    const res = await apiClient.patch<SupportTicketWithThread>(
      `/support/admin/tickets/${id}/status`,
      { status, expectedStatus },
    );
    return supportTicketWithThreadSchema.parse(res.data);
  },

  async assign(id: string, assigneeUserId: string | null): Promise<SupportTicketWithThread> {
    const res = await apiClient.patch<SupportTicketWithThread>(
      `/support/admin/tickets/${id}/assignee`,
      { assigneeUserId },
    );
    return supportTicketWithThreadSchema.parse(res.data);
  },

  async setPriority(id: string, priority: SupportPriorityValue): Promise<SupportTicketWithThread> {
    const res = await apiClient.patch<SupportTicketWithThread>(
      `/support/admin/tickets/${id}/priority`,
      { priority },
    );
    return supportTicketWithThreadSchema.parse(res.data);
  },

  async stats(): Promise<SupportInboxStats> {
    const res = await apiClient.get<SupportInboxStats>("/support/admin/stats");
    return supportInboxStatsSchema.parse(res.data);
  },

  async agents(): Promise<SupportAgent[]> {
    const res = await apiClient.get<SupportAgent[]>("/support/admin/agents");
    return z.array(supportAgentSchema).parse(res.data);
  },
};
