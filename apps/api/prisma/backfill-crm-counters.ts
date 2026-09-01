import "../src/config/load-env.js";

import { prisma } from "../src/shared/db/prisma.js";

const latestOf = (candidates: (Date | null | undefined)[]): Date | null => {
  const dates = candidates.filter((value): value is Date => value instanceof Date);
  if (dates.length === 0) return null;
  return dates.reduce((latest, current) => (current > latest ? current : latest));
};

export async function backfillCrmCounters(): Promise<number> {
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
}

async function main() {
  const updated = await backfillCrmCounters();
  console.warn(`Backfilled CRM counters for ${updated} organization(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
