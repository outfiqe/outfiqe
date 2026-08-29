import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import {
  getCrmMembership,
  getResolvedOrganization,
} from "#modules/crm-access/crm-access.middleware.js";

import type {
  AddCommentBody,
  AssignTicketBody,
  ChangeStatusBody,
  CreateTicketBody,
  ListTicketsQuery,
  TicketIdParams,
} from "./crm-tickets.schemas.js";
import { crmTicketsService } from "./crm-tickets.service.js";

const CREATED_STATUS = 201;

export const crmTicketsController = {
  async listTickets(_req: Request, res: Response) {
    const { status, assigneeMembershipId, type } = validated.query<ListTicketsQuery>(res);
    const organization = getResolvedOrganization(res);
    const tickets = await crmTicketsService.listTickets(organization.id, {
      status,
      assigneeMembershipId,
      type,
    });
    sendSuccess(res, tickets, "CRM tickets.");
  },

  async createTicket(_req: Request, res: Response) {
    const body = validated.body<CreateTicketBody>(res);
    const organization = getResolvedOrganization(res);
    const membership = getCrmMembership(res);
    const principal = requireAuthPrincipal(res);

    const ticket = await crmTicketsService.createTicket(
      organization,
      {
        type: body.type,
        title: body.title,
        description: body.description,
        subject: { subjectType: body.subjectType, subjectId: body.subjectId },
        assigneeMembershipId: body.assigneeMembershipId,
        createdByMembershipId: membership.id,
      },
      principal.userId,
    );
    sendSuccess(res, ticket, "Ticket created.", CREATED_STATUS);
  },

  async getTicket(_req: Request, res: Response) {
    const { ticketId } = validated.params<TicketIdParams>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(res, await crmTicketsService.getTicket(organization.id, ticketId), "CRM ticket.");
  },

  async changeStatus(_req: Request, res: Response) {
    const { ticketId } = validated.params<TicketIdParams>(res);
    const { status } = validated.body<ChangeStatusBody>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(
      res,
      await crmTicketsService.changeStatus(organization.id, ticketId, status),
      "Ticket status updated.",
    );
  },

  async assign(_req: Request, res: Response) {
    const { ticketId } = validated.params<TicketIdParams>(res);
    const { assigneeMembershipId } = validated.body<AssignTicketBody>(res);
    const organization = getResolvedOrganization(res);
    const principal = requireAuthPrincipal(res);
    sendSuccess(
      res,
      await crmTicketsService.assign(
        organization,
        ticketId,
        assigneeMembershipId,
        principal.userId,
      ),
      "Ticket assigned.",
    );
  },

  async addComment(_req: Request, res: Response) {
    const { ticketId } = validated.params<TicketIdParams>(res);
    const { body } = validated.body<AddCommentBody>(res);
    const organization = getResolvedOrganization(res);
    const membership = getCrmMembership(res);
    sendSuccess(
      res,
      await crmTicketsService.addComment(organization.id, ticketId, membership.id, body),
      "Comment added.",
      CREATED_STATUS,
    );
  },
};
