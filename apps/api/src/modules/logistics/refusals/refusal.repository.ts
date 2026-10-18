import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

const MAX_REFUSALS_LISTED = 50;

export type CustomerIdentity = { userId: string; phoneE164: string | null };

const activeRefusalsWhere = (
  { userId, phoneE164 }: CustomerIdentity,
  since?: Date,
): Prisma.CustomerDeliveryRefusalWhereInput => ({
  clearedAt: null,
  ...(since ? { refusedAt: { gte: since } } : {}),
  OR: [{ userId }, ...(phoneE164 ? [{ phoneE164 }] : [])],
});

export const logisticsRefusalRepository = {
  async recordRefusal(
    client: DbClient,
    refusal: CustomerIdentity & { orderId: string; shipmentId: string; refusedAt: Date },
  ): Promise<void> {
    await client.customerDeliveryRefusal.createMany({ data: [refusal], skipDuplicates: true });
  },

  async countActiveRefusalsSince(customer: CustomerIdentity, since: Date): Promise<number> {
    return prisma.customerDeliveryRefusal.count({ where: activeRefusalsWhere(customer, since) });
  },

  async listActiveRefusals(customer: CustomerIdentity) {
    return prisma.customerDeliveryRefusal.findMany({
      where: activeRefusalsWhere(customer),
      orderBy: { refusedAt: "desc" },
      take: MAX_REFUSALS_LISTED,
      select: { id: true, orderId: true, refusedAt: true },
    });
  },

  async clearActiveRefusals(
    client: DbClient,
    customer: CustomerIdentity,
    clearing: { clearedById: string; clearReason: string; clearedAt: Date },
  ): Promise<number> {
    const { count } = await client.customerDeliveryRefusal.updateMany({
      where: activeRefusalsWhere(customer),
      data: clearing,
    });
    return count;
  },

  async findOrderCustomer(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, phone: true, phoneE164: true, countryCode: true },
    });
  },
};
