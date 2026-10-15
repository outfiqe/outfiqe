import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

export const hubWithPickupZones = {
  pickupZones: {
    orderBy: { createdAt: "asc" },
    select: { deliveryZone: { select: { id: true, name: true } } },
  },
} satisfies Prisma.HubInclude;

export type HubRecord = Prisma.HubGetPayload<{ include: typeof hubWithPickupZones }>;

type HubWriteFields = Omit<Prisma.HubUncheckedCreateInput, "id" | "createdAt" | "updatedAt">;

export const logisticsHubRepository = {
  async listHubs(): Promise<HubRecord[]> {
    return prisma.hub.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: hubWithPickupZones,
    });
  },

  async findHubById(hubId: string, client: DbClient = prisma): Promise<HubRecord | null> {
    return client.hub.findUnique({ where: { id: hubId }, include: hubWithPickupZones });
  },

  async createHub(fields: HubWriteFields): Promise<HubRecord> {
    return prisma.hub.create({ data: fields, include: hubWithPickupZones });
  },

  async updateHub(hubId: string, fields: HubWriteFields): Promise<HubRecord> {
    return prisma.hub.update({ where: { id: hubId }, data: fields, include: hubWithPickupZones });
  },

  async countZonesInCountry(
    deliveryZoneIds: readonly string[],
    countryCode: string,
  ): Promise<number> {
    return prisma.deliveryZone.count({
      where: { id: { in: [...deliveryZoneIds] }, countryCode },
    });
  },

  async replaceHubPickupZones(
    client: DbClient,
    hubId: string,
    deliveryZoneIds: readonly string[],
  ): Promise<void> {
    await client.hubPickupZone.deleteMany({
      where: { hubId, deliveryZoneId: { notIn: [...deliveryZoneIds] } },
    });
    await client.hubPickupZone.createMany({
      data: deliveryZoneIds.map((deliveryZoneId) => ({ hubId, deliveryZoneId })),
      skipDuplicates: true,
    });
  },
};
