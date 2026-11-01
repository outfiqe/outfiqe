import { apiClient } from "@/shared/lib/apiClient";

import {
  createSupportResultSchema,
  type SupportRequestFormInput,
  type SupportTicketPage,
  supportTicketPageSchema,
  type SupportTicketWithThread,
  supportTicketWithThreadSchema,
} from "../schemas/support.schema";

export const supportApi = {
  async create(input: SupportRequestFormInput): Promise<{ reference: string; id: string }> {
    const res = await apiClient.post<{ reference: string; id: string }>("/support/tickets", {
      category: input.category,
      subject: input.subject,
      message: input.message,
      relatedOrderId: input.relatedOrderId || null,
    });
    return createSupportResultSchema.parse(res.data);
  },

  async listMine(cursor?: string, search?: string): Promise<SupportTicketPage> {
    const res = await apiClient.get<SupportTicketPage>("/support/tickets/mine", {
      params: { cursor, search },
    });
    return supportTicketPageSchema.parse(res.data);
  },

  async getMine(id: string): Promise<SupportTicketWithThread> {
    const res = await apiClient.get<SupportTicketWithThread>(`/support/tickets/mine/${id}`);
    return supportTicketWithThreadSchema.parse(res.data);
  },

  async replyMine(id: string, body: string): Promise<SupportTicketWithThread> {
    const res = await apiClient.post<SupportTicketWithThread>(
      `/support/tickets/mine/${id}/messages`,
      { body, attachmentUrls: [] },
    );
    return supportTicketWithThreadSchema.parse(res.data);
  },

  async reopen(token: string): Promise<{ reference: string }> {
    const res = await apiClient.post<{ reference: string }>(
      `/support/reopen/${encodeURIComponent(token)}`,
      {},
    );
    return res.data;
  },
};
