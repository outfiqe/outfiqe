import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import {
  SupportAuthorKind,
  type SupportPriority,
  SupportStatus,
  SupportVisibility,
} from "#generated/prisma/enums.js";
import { decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import {
  AWAITING_STAFF_STATUSES,
  formatReference,
  RESOLVED_STATUSES,
} from "./support.constants.js";
import type {
  AddSupportMessageInput,
  CreateSupportTicketInput,
  SupportInboxStats,
  SupportMessageRecord,
  SupportTicketFilters,
  SupportTicketRecord,
  SupportTicketWithThread,
} from "./support.types.js";

type SupportListCursor = { createdAt: string; id: string };

const ticketSelect = {
  id: true,
  ticketNumber: true,
  requesterUserId: true,
  requesterEmail: true,
  requesterName: true,
  segment: true,
  category: true,
  subject: true,
  status: true,
  priority: true,
  assigneeUserId: true,
  relatedOrderId: true,
  relatedBrandId: true,
  firstRespondedAt: true,
  resolvedAt: true,
  lastCustomerAt: true,
  createdAt: true,
  updatedAt: true,
  assigneeUser: { select: { name: true } },
  relatedBrand: { select: { name: true } },
  _count: { select: { messages: true } },
} as const;

const messageSelect = {
  id: true,
  ticketId: true,
  authorKind: true,
  authorUserId: true,
  visibility: true,
  body: true,
  attachmentUrls: true,
  createdAt: true,
  authorUser: { select: { name: true } },
} as const;

type TicketRow = Prisma.SupportTicketGetPayload<{ select: typeof ticketSelect }>;
type MessageRow = Prisma.SupportMessageGetPayload<{ select: typeof messageSelect }>;

const toMessageRecord = (row: MessageRow): SupportMessageRecord => ({
  id: row.id,
  ticketId: row.ticketId,
  authorKind: row.authorKind,
  authorUserId: row.authorUserId,
  authorName: row.authorUser?.name ?? null,
  visibility: row.visibility,
  body: row.body,
  attachmentUrls: row.attachmentUrls,
  createdAt: row.createdAt.toISOString(),
});

const toTicketRecord = (row: TicketRow): SupportTicketRecord => ({
  id: row.id,
  reference: formatReference(row.ticketNumber),
  ticketNumber: row.ticketNumber,
  requesterUserId: row.requesterUserId,
  requesterEmail: row.requesterEmail,
  requesterName: row.requesterName,
  segment: row.segment,
  category: row.category,
  subject: row.subject,
  status: row.status,
  priority: row.priority,
  assigneeUserId: row.assigneeUserId,
  assigneeName: row.assigneeUser?.name ?? null,
  relatedOrderId: row.relatedOrderId,
  relatedBrandId: row.relatedBrandId,
  relatedBrandName: row.relatedBrand?.name ?? null,
  firstRespondedAt: row.firstRespondedAt?.toISOString() ?? null,
  resolvedAt: row.resolvedAt?.toISOString() ?? null,
  lastCustomerAt: row.lastCustomerAt?.toISOString() ?? null,
  messageCount: row._count.messages,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const buildAdminWhere = (filters: SupportTicketFilters): Prisma.SupportTicketWhereInput => ({
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.category ? { category: filters.category } : {}),
  ...(filters.segment ? { segment: filters.segment } : {}),
  ...(filters.unassigned
    ? { assigneeUserId: null }
    : filters.assigneeUserId
      ? { assigneeUserId: filters.assigneeUserId }
      : {}),
  ...(filters.search
    ? { subject: { contains: filters.search, mode: Prisma.QueryMode.insensitive } }
    : {}),
});

const listPage = async (
  where: Prisma.SupportTicketWhereInput,
  params: { cursor?: string; limit: number },
): Promise<{ tickets: SupportTicketRecord[]; nextCursor: string | null }> => {
  const decoded = decodeCursor<SupportListCursor>(params.cursor);
  const rows = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: params.limit + 1,
    ...(decoded
      ? {
          cursor: { id: decoded.id },
          skip: 1,
        }
      : {}),
    select: ticketSelect,
  });

  const hasMore = rows.length > params.limit;
  const page = hasMore ? rows.slice(0, params.limit) : rows;
  const last = page.at(-1);
  return {
    tickets: page.map(toTicketRecord),
    nextCursor:
      hasMore && last
        ? encodeCursor<SupportListCursor>({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null,
  };
};

export const supportRepository = {
  async create(input: CreateSupportTicketInput): Promise<SupportTicketWithThread> {
    const created = await prisma.supportTicket.create({
      data: {
        requesterUserId: input.requester.userId,
        requesterEmail: input.requester.email,
        requesterName: input.requester.name,
        emailVerifiedAt: new Date(),
        segment: input.requester.segment,
        category: input.category,
        subject: input.subject,
        relatedOrderId: input.relatedOrderId,
        relatedBrandId: input.requester.relatedBrandId,
        lastCustomerAt: new Date(),
        sourceIp: input.sourceIp,
        userAgent: input.userAgent,
        messages: {
          create: {
            authorKind: SupportAuthorKind.REQUESTER,
            authorUserId: input.requester.userId,
            visibility: SupportVisibility.PUBLIC,
            body: input.message,
            attachmentUrls: input.attachmentUrls,
          },
        },
      },
      select: { id: true },
    });
    const ticket = await this.findForAdmin(created.id);
    if (!ticket) throw new Error("support ticket vanished immediately after creation");
    return ticket;
  },

  async findForRequester(
    ticketId: string,
    requesterUserId: string,
  ): Promise<SupportTicketWithThread | null> {
    const row = await prisma.supportTicket.findFirst({
      where: { id: ticketId, requesterUserId },
      select: {
        ...ticketSelect,
        messages: {
          where: { visibility: SupportVisibility.PUBLIC },
          orderBy: { createdAt: "asc" },
          select: messageSelect,
        },
      },
    });
    if (!row) return null;
    const { messages, ...ticket } = row;
    return { ...toTicketRecord(ticket), messages: messages.map(toMessageRecord) };
  },

  async findForAdmin(ticketId: string): Promise<SupportTicketWithThread | null> {
    const row = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        ...ticketSelect,
        messages: { orderBy: { createdAt: "asc" }, select: messageSelect },
      },
    });
    if (!row) return null;
    const { messages, ...ticket } = row;
    return { ...toTicketRecord(ticket), messages: messages.map(toMessageRecord) };
  },

  listForRequester(
    requesterUserId: string,
    params: { cursor?: string; limit: number },
  ): Promise<{ tickets: SupportTicketRecord[]; nextCursor: string | null }> {
    return listPage({ requesterUserId }, params);
  },

  listForAdmin(
    filters: SupportTicketFilters,
    params: { cursor?: string; limit: number },
  ): Promise<{ tickets: SupportTicketRecord[]; nextCursor: string | null }> {
    return listPage(buildAdminWhere(filters), params);
  },

  async addMessage(input: AddSupportMessageInput): Promise<SupportMessageRecord> {
    const row = await prisma.supportMessage.create({
      data: {
        ticketId: input.ticketId,
        authorKind: input.authorKind,
        authorUserId: input.authorUserId,
        visibility: input.visibility,
        body: input.body,
        attachmentUrls: input.attachmentUrls,
        emailMessageId: input.emailMessageId ?? null,
      },
      select: messageSelect,
    });
    return toMessageRecord(row);
  },

  async transitionStatus(
    ticketId: string,
    fromStatus: SupportStatus,
    toStatus: SupportStatus,
  ): Promise<boolean> {
    const result = await prisma.supportTicket.updateMany({
      where: { id: ticketId, status: fromStatus },
      data: {
        status: toStatus,
        resolvedAt:
          toStatus === SupportStatus.RESOLVED
            ? new Date()
            : toStatus === SupportStatus.OPEN
              ? null
              : undefined,
      },
    });
    return result.count > 0;
  },

  async assign(ticketId: string, assigneeUserId: string | null): Promise<void> {
    await prisma.supportTicket.update({ where: { id: ticketId }, data: { assigneeUserId } });
  },

  async setPriority(ticketId: string, priority: SupportPriority): Promise<void> {
    await prisma.supportTicket.update({ where: { id: ticketId }, data: { priority } });
  },

  async stampFirstResponded(ticketId: string): Promise<void> {
    await prisma.supportTicket.updateMany({
      where: { id: ticketId, firstRespondedAt: null },
      data: { firstRespondedAt: new Date() },
    });
  },

  async touchCustomerActivity(ticketId: string): Promise<void> {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { lastCustomerAt: new Date() },
    });
  },

  async setReopenToken(ticketId: string, reopenTokenHash: string | null): Promise<void> {
    await prisma.supportTicket.update({ where: { id: ticketId }, data: { reopenTokenHash } });
  },

  findByReopenToken(
    reopenTokenHash: string,
  ): Promise<{ id: string; status: SupportStatus } | null> {
    return prisma.supportTicket.findFirst({
      where: { reopenTokenHash },
      select: { id: true, status: true },
    });
  },

  async inboxStats(): Promise<SupportInboxStats> {
    const [open, unassigned, awaitingUs, oldestWaiting] = await Promise.all([
      prisma.supportTicket.count({ where: { status: { notIn: RESOLVED_STATUSES } } }),
      prisma.supportTicket.count({
        where: { assigneeUserId: null, status: { notIn: RESOLVED_STATUSES } },
      }),
      prisma.supportTicket.count({ where: { status: { in: AWAITING_STAFF_STATUSES } } }),
      prisma.supportTicket.findFirst({
        where: { status: { in: AWAITING_STAFF_STATUSES } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    const oldestWaitingAgeHours = oldestWaiting
      ? Math.round((Date.now() - oldestWaiting.createdAt.getTime()) / (60 * 60 * 1000))
      : null;

    return { open, unassigned, awaitingUs, oldestWaitingAgeHours };
  },

  async findRequesterBrandId(userId: string): Promise<string | null> {
    const membership = await prisma.brandMembership.findFirst({
      where: { userId },
      select: { brandId: true },
    });
    return membership?.brandId ?? null;
  },

  async listAgents(): Promise<{ userId: string; name: string }[]> {
    const rows = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => ({ userId: row.id, name: row.name }));
  },

  async orderBelongsToUser(orderId: string, userId: string): Promise<boolean> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true },
    });
    return order !== null;
  },

  async closeStaleResolved(olderThan: Date): Promise<number> {
    const result = await prisma.supportTicket.updateMany({
      where: { status: "RESOLVED", resolvedAt: { lt: olderThan } },
      data: { status: "CLOSED", reopenTokenHash: null },
    });
    return result.count;
  },
};
