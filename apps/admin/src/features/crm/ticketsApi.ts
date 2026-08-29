import { apiClient } from "@/lib/apiClient";

import {
  type Ticket,
  ticketListSchema,
  ticketSchema,
  type TicketStatusValue,
  type TicketTypeValue,
  type TicketWithComments,
  ticketWithCommentsSchema,
} from "./ticketsSchemas";

export const crmTicketsApi = {
  async listTickets(filters: { status?: TicketStatusValue } = {}): Promise<Ticket[]> {
    const res = await apiClient.get<Ticket[]>("/crm/tickets", { params: filters });
    return ticketListSchema.parse(res.data);
  },

  async getTicket(ticketId: string): Promise<TicketWithComments> {
    const res = await apiClient.get<TicketWithComments>(`/crm/tickets/${ticketId}`);
    return ticketWithCommentsSchema.parse(res.data);
  },

  async createTicket(input: {
    type: TicketTypeValue;
    title: string;
    description: string;
    subjectType: "partner" | "customer";
    subjectId: string;
  }): Promise<Ticket> {
    const res = await apiClient.post<Ticket>("/crm/tickets", input);
    return ticketSchema.parse(res.data);
  },

  async changeStatus(ticketId: string, status: TicketStatusValue): Promise<TicketWithComments> {
    const res = await apiClient.patch<TicketWithComments>(`/crm/tickets/${ticketId}/status`, {
      status,
    });
    return ticketWithCommentsSchema.parse(res.data);
  },

  async assign(ticketId: string, assigneeMembershipId: string | null): Promise<Ticket> {
    const res = await apiClient.patch<Ticket>(`/crm/tickets/${ticketId}/assignee`, {
      assigneeMembershipId,
    });
    return ticketSchema.parse(res.data);
  },

  async addComment(ticketId: string, body: string): Promise<void> {
    await apiClient.post(`/crm/tickets/${ticketId}/comments`, { body });
  },
};
