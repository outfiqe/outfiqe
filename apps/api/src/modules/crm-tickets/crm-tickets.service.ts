import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { CrmTicketStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmRelationshipsService } from "#modules/crm-relationships/crm-relationships.service.js";

import { ALLOWED_TICKET_TRANSITIONS } from "./crm-tickets.constants.js";
import { crmTicketsRepository } from "./crm-tickets.repository.js";
import type {
  CreateTicketInput,
  TicketCommentRecord,
  TicketRecord,
  TicketSubjectRef,
  TicketWithComments,
} from "./crm-tickets.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const BAD_REQUEST_STATUS = 400;

type TenantOrganization = { id: string; linkedBrandId: string | null };

const requireValidSubject = async (
  organization: TenantOrganization,
  subject: TicketSubjectRef,
): Promise<void> => {
  const belongs =
    subject.subjectType === "partner"
      ? await crmRelationshipsService.isPartner(organization, subject.subjectId)
      : await crmRelationshipsService.isCustomer(organization, subject.subjectId);
  if (!belongs) {
    throw new AppError("SUBJECT_NOT_FOUND", "That subject isn't in this CRM.", NOT_FOUND_STATUS);
  }
};

const requireMembership = async (
  organizationId: string,
  membershipId: string,
): Promise<{ id: string; userId: string }> => {
  const membership = await crmTicketsRepository.findMembershipWithUser(
    organizationId,
    membershipId,
  );
  if (!membership) {
    throw new AppError(
      "MEMBERSHIP_NOT_FOUND",
      "That teammate isn't a member of this organization.",
      BAD_REQUEST_STATUS,
    );
  }
  return membership;
};

const emitAssignment = async (
  organizationId: string,
  ticket: TicketRecord,
  assigneeUserId: string,
  assignedByUserId: string | null,
): Promise<void> => {
  await eventBus.publish(DomainEvents.CRM_ITEM_ASSIGNED, {
    organizationId,
    itemKind: "ticket",
    itemId: ticket.id,
    title: ticket.title,
    assigneeUserId,
    assignedByUserId,
  });
};

export const crmTicketsService = {
  async createTicket(
    organization: TenantOrganization,
    input: Omit<CreateTicketInput, "organizationId">,
    actorUserId: string | null,
  ): Promise<TicketRecord> {
    await requireValidSubject(organization, input.subject);

    let assigneeUserId: string | null = null;
    if (input.assigneeMembershipId) {
      assigneeUserId = (await requireMembership(organization.id, input.assigneeMembershipId))
        .userId;
    }

    const ticket = await crmTicketsRepository.createTicket({
      ...input,
      organizationId: organization.id,
    });

    if (assigneeUserId) await emitAssignment(organization.id, ticket, assigneeUserId, actorUserId);
    return ticket;
  },

  listTickets(
    organizationId: string,
    filters: {
      status?: CrmTicketStatus;
      assigneeMembershipId?: string;
      type?: TicketRecord["type"];
    },
  ): Promise<TicketRecord[]> {
    return crmTicketsRepository.listTickets(organizationId, filters);
  },

  async getTicket(organizationId: string, ticketId: string): Promise<TicketWithComments> {
    const ticket = await crmTicketsRepository.findTicket(organizationId, ticketId);
    if (!ticket) throw new AppError("TICKET_NOT_FOUND", "Ticket not found.", NOT_FOUND_STATUS);
    return ticket;
  },

  async changeStatus(
    organizationId: string,
    ticketId: string,
    toStatus: CrmTicketStatus,
  ): Promise<TicketWithComments> {
    const ticket = await this.getTicket(organizationId, ticketId);
    if (ticket.status === toStatus) return ticket;

    if (!ALLOWED_TICKET_TRANSITIONS[ticket.status].includes(toStatus)) {
      throw new AppError(
        "INVALID_TICKET_TRANSITION",
        `A ${ticket.status} ticket can't move to ${toStatus}.`,
        CONFLICT_STATUS,
      );
    }

    const moved = await crmTicketsRepository.transitionStatus(
      organizationId,
      ticketId,
      ticket.status,
      toStatus,
    );
    if (!moved) {
      throw new AppError(
        "TICKET_STATUS_CHANGED",
        "This ticket's status changed under you — reload and try again.",
        CONFLICT_STATUS,
      );
    }

    return this.getTicket(organizationId, ticketId);
  },

  async assign(
    organization: TenantOrganization,
    ticketId: string,
    assigneeMembershipId: string | null,
    actorUserId: string | null,
  ): Promise<TicketRecord> {
    await this.getTicket(organization.id, ticketId);

    let assigneeUserId: string | null = null;
    if (assigneeMembershipId) {
      assigneeUserId = (await requireMembership(organization.id, assigneeMembershipId)).userId;
    }

    const ticket = await crmTicketsRepository.assignTicket(
      organization.id,
      ticketId,
      assigneeMembershipId,
    );

    if (assigneeUserId) await emitAssignment(organization.id, ticket, assigneeUserId, actorUserId);
    return ticket;
  },

  async addComment(
    organizationId: string,
    ticketId: string,
    authorMembershipId: string | null,
    body: string,
  ): Promise<TicketCommentRecord> {
    await this.getTicket(organizationId, ticketId);
    return crmTicketsRepository.addComment(ticketId, authorMembershipId, body);
  },
};
