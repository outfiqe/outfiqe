import { prisma } from "#db/prisma.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

export const CRM_COUNTER_RECONCILE_INTERVAL_MS = 24 * ONE_HOUR_MS;

export type CrmCounterField = "contactCount" | "dealCount" | "ticketCount" | "activityCount";

export const applyCrmCounterDelta = async (
  organizationId: string,
  field: CrmCounterField,
  delta: 1 | -1,
  { touchLastActivity = true }: { touchLastActivity?: boolean } = {},
): Promise<void> => {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      [field]: delta === 1 ? { increment: 1 } : { decrement: 1 },
      ...(touchLastActivity ? { lastCrmActivityAt: new Date() } : {}),
    },
  });
};

export const touchCrmActivity = async (organizationId: string): Promise<void> => {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { lastCrmActivityAt: new Date() },
  });
};

const latestOf = (candidates: (Date | null | undefined)[]): Date | null => {
  const dates = candidates.filter((value): value is Date => value instanceof Date);
  if (dates.length === 0) return null;
  return dates.reduce((latest, current) => (current > latest ? current : latest));
};

export const recomputeCrmCounters = async (): Promise<number> => {
  const organizations = await prisma.organization.findMany({ select: { id: true } });

  for (const organization of organizations) {
    const where = { organizationId: organization.id };
    const [
      contactCount,
      dealCount,
      ticketCount,
      activityCount,
      latestActivity,
      latestDeal,
      latestTicket,
      latestContact,
    ] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.deal.count({ where }),
      prisma.crmTicket.count({ where }),
      prisma.crmActivity.count({ where }),
      prisma.crmActivity.findFirst({
        where,
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      }),
      prisma.deal.findFirst({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      prisma.crmTicket.findFirst({
        where,
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.contact.findFirst({
        where,
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        contactCount,
        dealCount,
        ticketCount,
        activityCount,
        lastCrmActivityAt: latestOf([
          latestActivity?.occurredAt,
          latestDeal?.updatedAt,
          latestTicket?.updatedAt,
          latestContact?.updatedAt,
        ]),
      },
    });
  }

  return organizations.length;
};
