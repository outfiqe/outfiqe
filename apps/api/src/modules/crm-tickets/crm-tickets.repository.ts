import { prisma } from "#db/prisma.js";
import { CrmTicketStatus } from "#generated/prisma/enums.js";

import { RESOLVED_TICKET_STATUSES } from "./crm-tickets.constants.js";
import type {
  CreateTicketInput,
  TicketCommentRecord,
  TicketRecord,
  TicketWithComments,
} from "./crm-tickets.types.js";

const ticketSelect = {
  id: true,
  organizationId: true,
  type: true,
  status: true,
  title: true,
  description: true,
  partnerCreatorId: true,
  customerUserId: true,
  assigneeMembershipId: true,
  createdByMembershipId: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  assigneeMembership: { select: { user: { select: { name: true } } } },
} as const;

const commentSelect = {
  id: true,
  ticketId: true,
  authorMembershipId: true,
  body: true,
  createdAt: true,
  authorMembership: { select: { user: { select: { name: true } } } },
} as const;

type TicketRow = {
  id: string;
  organizationId: string;
  type: TicketRecord["type"];
  status: CrmTicketStatus;
  title: string;
  description: string;
  partnerCreatorId: string | null;
  customerUserId: string | null;
  assigneeMembershipId: string | null;
  createdByMembershipId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assigneeMembership: { user: { name: string } } | null;
};

type CommentRow = {
  id: string;
  ticketId: string;
  authorMembershipId: string | null;
  body: string;
  createdAt: Date;
  authorMembership: { user: { name: string } } | null;
};

const toTicketRecord = (row: TicketRow): TicketRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  type: row.type,
  status: row.status,
  title: row.title,
  description: row.description,
  partnerCreatorId: row.partnerCreatorId,
  customerUserId: row.customerUserId,
  assigneeMembershipId: row.assigneeMembershipId,
  assigneeName: row.assigneeMembership?.user.name ?? null,
  createdByMembershipId: row.createdByMembershipId,
  resolvedAt: row.resolvedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toCommentRecord = (row: CommentRow): TicketCommentRecord => ({
  id: row.id,
  ticketId: row.ticketId,
  authorMembershipId: row.authorMembershipId,
  authorName: row.authorMembership?.user.name ?? null,
  body: row.body,
  createdAt: row.createdAt.toISOString(),
});

export const crmTicketsRepository = {
  async createTicket(input: CreateTicketInput): Promise<TicketRecord> {
    const row = await prisma.crmTicket.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        title: input.title,
        description: input.description,
        partnerCreatorId: input.subject.subjectType === "partner" ? input.subject.subjectId : null,
        customerUserId: input.subject.subjectType === "customer" ? input.subject.subjectId : null,
        assigneeMembershipId: input.assigneeMembershipId,
        createdByMembershipId: input.createdByMembershipId,
      },
      select: ticketSelect,
    });
    return toTicketRecord(row);
  },

  async listTickets(
    organizationId: string,
    filters: {
      status?: CrmTicketStatus;
      assigneeMembershipId?: string;
      type?: TicketRecord["type"];
    },
  ): Promise<TicketRecord[]> {
    const rows = await prisma.crmTicket.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.assigneeMembershipId
          ? { assigneeMembershipId: filters.assigneeMembershipId }
          : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: ticketSelect,
    });
    return rows.map(toTicketRecord);
  },

  async findTicket(organizationId: string, ticketId: string): Promise<TicketWithComments | null> {
    const row = await prisma.crmTicket.findFirst({
      where: { id: ticketId, organizationId },
      select: {
        ...ticketSelect,
        comments: { select: commentSelect, orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) return null;
    const { comments, ...ticket } = row;
    return { ...toTicketRecord(ticket), comments: comments.map(toCommentRecord) };
  },

  async transitionStatus(
    organizationId: string,
    ticketId: string,
    fromStatus: CrmTicketStatus,
    toStatus: CrmTicketStatus,
  ): Promise<boolean> {
    const result = await prisma.crmTicket.updateMany({
      where: { id: ticketId, organizationId, status: fromStatus },
      data: {
        status: toStatus,
        resolvedAt: RESOLVED_TICKET_STATUSES.includes(toStatus)
          ? new Date()
          : toStatus === CrmTicketStatus.IN_PROGRESS || toStatus === CrmTicketStatus.OPEN
            ? null
            : undefined,
      },
    });
    return result.count > 0;
  },

  async assignTicket(
    organizationId: string,
    ticketId: string,
    assigneeMembershipId: string | null,
  ): Promise<TicketRecord> {
    const row = await prisma.crmTicket.update({
      where: { id: ticketId, organizationId },
      data: { assigneeMembershipId },
      select: ticketSelect,
    });
    return toTicketRecord(row);
  },

  async addComment(
    ticketId: string,
    authorMembershipId: string | null,
    body: string,
  ): Promise<TicketCommentRecord> {
    const row = await prisma.crmTicketComment.create({
      data: { ticketId, authorMembershipId, body },
      select: commentSelect,
    });
    return toCommentRecord(row);
  },

  async findMembershipWithUser(
    organizationId: string,
    membershipId: string,
  ): Promise<{ id: string; userId: string } | null> {
    return prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
      select: { id: true, userId: true },
    });
  },
};
