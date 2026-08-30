import { z } from "zod";

export const TICKET_TYPES = ["COMPLAINT", "REQUEST"] as const;
export type TicketTypeValue = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type TicketStatusValue = (typeof TICKET_STATUSES)[number];

export const ticketSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  type: z.enum(TICKET_TYPES),
  status: z.enum(TICKET_STATUSES),
  title: z.string(),
  description: z.string(),
  partnerCreatorId: z.string().nullable(),
  customerUserId: z.string().nullable(),
  assigneeMembershipId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  createdByMembershipId: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const ticketCommentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  authorMembershipId: z.string().nullable(),
  authorName: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(),
});
export type TicketComment = z.infer<typeof ticketCommentSchema>;

export const ticketWithCommentsSchema = ticketSchema.extend({
  comments: z.array(ticketCommentSchema),
});
export type TicketWithComments = z.infer<typeof ticketWithCommentsSchema>;

export const ticketListSchema = z.array(ticketSchema);
