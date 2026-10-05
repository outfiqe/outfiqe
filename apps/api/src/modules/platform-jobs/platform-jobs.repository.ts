import { prisma } from "#db/prisma.js";
import { OUTBOX_MAX_PUBLISH_ATTEMPTS } from "#outbox/outbox.constants.js";

import { PLATFORM_JOBS_LIMITS } from "./platform-jobs.constants.js";

const NO_ROWS = 0;
const FRESH_ATTEMPT_COUNT = 0;

const stuckWhere = { publishedAt: null, attempts: { gte: OUTBOX_MAX_PUBLISH_ATTEMPTS } };

export const platformJobsRepository = {
  countUnpublished(): Promise<number> {
    return prisma.outboxEvent.count({ where: { publishedAt: null } });
  },

  async findOldestUnpublishedAt(): Promise<Date | null> {
    const oldest = await prisma.outboxEvent.findFirst({
      where: { publishedAt: null },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    return oldest?.createdAt ?? null;
  },

  countStuck(): Promise<number> {
    return prisma.outboxEvent.count({ where: stuckWhere });
  },

  listStuck() {
    return prisma.outboxEvent.findMany({
      where: stuckWhere,
      orderBy: { createdAt: "asc" },
      take: PLATFORM_JOBS_LIMITS.STUCK_EVENTS_SHOWN,
      select: { id: true, topic: true, attempts: true, lastError: true, createdAt: true },
    });
  },

  async resetStuckEvent(eventId: string): Promise<boolean> {
    const { count } = await prisma.outboxEvent.updateMany({
      where: { id: eventId, publishedAt: null },
      data: { attempts: FRESH_ATTEMPT_COUNT, lastError: null },
    });
    return count > NO_ROWS;
  },
};
