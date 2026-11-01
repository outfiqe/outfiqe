import { prisma } from "#db/prisma.js";
import { CrmTaskStatus } from "#generated/prisma/enums.js";

import { CONNECTED_RECORDS_PER_TYPE } from "../crm-reporting.constants.js";
import type {
  ConnectedTask,
  ContactSearchResult,
  DealSearchResult,
  TicketSearchResult,
} from "../crm-reporting.types.js";

type LinkedRecords = {
  userIds: string[];
  dealId: string | null;
  contactId: string | null;
  ticketId: string | null;
};

export const crmConnectionsRepository = {
  findPeople(userIds: string[]) {
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, handle: true },
    });
  },

  listContacts(organizationId: string, links: LinkedRecords): Promise<ContactSearchResult[]> {
    return prisma.contact.findMany({
      where: {
        organizationId,
        linkedUserId: { in: links.userIds },
        ...(links.contactId ? { id: { not: links.contactId } } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: CONNECTED_RECORDS_PER_TYPE,
      select: { id: true, name: true, company: true, lifecycleStage: true },
    });
  },

  async listDeals(organizationId: string, links: LinkedRecords): Promise<DealSearchResult[]> {
    const deals = await prisma.deal.findMany({
      where: {
        organizationId,
        partnerCreatorId: { in: links.userIds },
        ...(links.dealId ? { id: { not: links.dealId } } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: CONNECTED_RECORDS_PER_TYPE,
      select: {
        id: true,
        title: true,
        value: true,
        status: true,
        stage: { select: { name: true } },
      },
    });
    return deals.map(({ stage, ...deal }) => ({ ...deal, stageName: stage.name }));
  },

  listTickets(organizationId: string, links: LinkedRecords): Promise<TicketSearchResult[]> {
    return prisma.crmTicket.findMany({
      where: {
        organizationId,
        OR: [
          { customerUserId: { in: links.userIds } },
          { partnerCreatorId: { in: links.userIds } },
        ],
        ...(links.ticketId ? { id: { not: links.ticketId } } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: CONNECTED_RECORDS_PER_TYPE,
      select: { id: true, title: true, type: true, status: true },
    });
  },

  async listOpenTasks(organizationId: string, links: LinkedRecords): Promise<ConnectedTask[]> {
    const tasks = await prisma.crmTask.findMany({
      where: {
        organizationId,
        status: CrmTaskStatus.OPEN,
        OR: [
          { customerUserId: { in: links.userIds } },
          { partnerCreatorId: { in: links.userIds } },
          ...(links.dealId ? [{ dealId: links.dealId }] : []),
          ...(links.contactId ? [{ contactId: links.contactId }] : []),
        ],
      },
      orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      take: CONNECTED_RECORDS_PER_TYPE,
      select: {
        id: true,
        title: true,
        dueAt: true,
        assigneeMembership: { select: { user: { select: { name: true } } } },
      },
    });
    return tasks.map(({ id, title, dueAt, assigneeMembership }) => ({
      id,
      title,
      dueAt: dueAt.toISOString(),
      assigneeName: assigneeMembership.user.name,
    }));
  },
};

export type { LinkedRecords };
