import { z } from "zod";

import { CrmTicketStatus, CrmTicketType } from "#generated/prisma/enums.js";

import { TICKET_SUBJECT_TYPES } from "./crm-tickets.constants.js";

export const listTicketsQuerySchema = z.object({
  status: z.enum(CrmTicketStatus).optional(),
  assigneeMembershipId: z.uuid().optional(),
  type: z.enum(CrmTicketType).optional(),
});

export const createTicketSchema = z.object({
  type: z.enum(CrmTicketType),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(8000),
  subjectType: z.enum(TICKET_SUBJECT_TYPES),
  subjectId: z.uuid(),
  assigneeMembershipId: z.uuid().nullable().optional().default(null),
});

export const ticketIdParamsSchema = z.object({ ticketId: z.uuid() });

export const changeStatusSchema = z.object({ status: z.enum(CrmTicketStatus) });

export const assignTicketSchema = z.object({
  assigneeMembershipId: z.uuid().nullable(),
});

export const addCommentSchema = z.object({
  body: z.string().trim().min(1).max(8000),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateTicketBody = z.infer<typeof createTicketSchema>;
export type TicketIdParams = z.infer<typeof ticketIdParamsSchema>;
export type ChangeStatusBody = z.infer<typeof changeStatusSchema>;
export type AssignTicketBody = z.infer<typeof assignTicketSchema>;
export type AddCommentBody = z.infer<typeof addCommentSchema>;
