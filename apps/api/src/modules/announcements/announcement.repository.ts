import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { AnnouncementStatus } from "#generated/prisma/enums.js";

import type {
  AnnouncementListFilters,
  AnnouncementRecord,
  AudiencePage,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "./announcement.types.js";
import { toAnnouncementRecord } from "./announcement.utils.js";

const WITH_AUDIENCES = { include: { audiences: true } } as const;

export const announcementRepository = {
  async create(input: CreateAnnouncementInput): Promise<AnnouncementRecord> {
    const { audiences, ...rest } = input;
    const created = await prisma.announcement.create({
      data: {
        ...rest,
        audiences: { create: audiences.map((audience) => ({ audience })) },
      },
      ...WITH_AUDIENCES,
    });
    return toAnnouncementRecord(created);
  },

  async findById(id: string): Promise<AnnouncementRecord | null> {
    const found = await prisma.announcement.findUnique({ where: { id }, ...WITH_AUDIENCES });
    return found ? toAnnouncementRecord(found) : null;
  },

  async update(id: string, input: UpdateAnnouncementInput): Promise<AnnouncementRecord> {
    const { audiences, ...rest } = input;
    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...rest,
        audiences: { deleteMany: {}, create: audiences.map((audience) => ({ audience })) },
      },
      ...WITH_AUDIENCES,
    });
    return toAnnouncementRecord(updated);
  },

  async list(filters: AnnouncementListFilters): Promise<AnnouncementRecord[]> {
    const rows = await prisma.announcement.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      ...WITH_AUDIENCES,
    });
    return rows.map(toAnnouncementRecord);
  },

  async countAudience(where: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  },

  async findAudiencePage(
    where: Prisma.UserWhereInput,
    params: { cursor?: string; limit: number },
  ): Promise<AudiencePage> {
    const rows = await prisma.user.findMany({
      where,
      select: { id: true },
      orderBy: { id: "asc" },
      take: params.limit,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const isFullPage = rows.length === params.limit;
    const last = rows.at(-1);
    return {
      ids: rows.map((row) => row.id),
      nextCursor: isFullPage && last ? last.id : null,
    };
  },

  async claimForSending(
    id: string,
    fromStatus: typeof AnnouncementStatus.DRAFT | typeof AnnouncementStatus.SCHEDULED,
  ): Promise<boolean> {
    const result = await prisma.announcement.updateMany({
      where: { id, status: fromStatus },
      data: { status: AnnouncementStatus.SENDING },
    });
    return result.count > 0;
  },

  async markScheduled(id: string, scheduledAt: Date): Promise<AnnouncementRecord> {
    const updated = await prisma.announcement.update({
      where: { id },
      data: { status: AnnouncementStatus.SCHEDULED, scheduledAt },
      ...WITH_AUDIENCES,
    });
    return toAnnouncementRecord(updated);
  },

  async markSent(id: string, recipientCount: number): Promise<AnnouncementRecord> {
    const updated = await prisma.announcement.update({
      where: { id },
      data: { status: AnnouncementStatus.SENT, sentAt: new Date(), recipientCount },
      ...WITH_AUDIENCES,
    });
    return toAnnouncementRecord(updated);
  },

  async cancel(id: string): Promise<boolean> {
    const result = await prisma.announcement.updateMany({
      where: { id, status: { in: [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED] } },
      data: { status: AnnouncementStatus.CANCELED },
    });
    return result.count > 0;
  },

  async findDueScheduledIds(dueBy: Date): Promise<string[]> {
    const rows = await prisma.announcement.findMany({
      where: { status: AnnouncementStatus.SCHEDULED, scheduledAt: { lte: dueBy } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
};
