import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

import type { DeliveryZoneRecord, DeliveryZoneSnapshot } from "./deliveryZone.types.js";
import { normalizeCityName } from "./deliveryZone.utils.js";

const zoneWithCities = { cities: true } satisfies Prisma.DeliveryZoneInclude;

type DeliveryZoneScalarInput = {
  name: string;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  codHandlingFee: number;
};

export const deliveryZoneRepository = {
  async listAll(): Promise<DeliveryZoneRecord[]> {
    return prisma.deliveryZone.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: zoneWithCities,
    });
  },

  async findById(id: string, client: DbClient = prisma): Promise<DeliveryZoneRecord | null> {
    return client.deliveryZone.findUnique({ where: { id }, include: zoneWithCities });
  },

  async searchCities(query: string, limit: number) {
    return prisma.deliveryZoneCity.findMany({
      where: { city: { contains: query, mode: "insensitive" } },
      orderBy: { city: "asc" },
      take: limit,
      include: { zone: true },
    });
  },

  async findByCityNormalized(
    cityNormalized: string,
    client: DbClient = prisma,
  ): Promise<DeliveryZoneRecord | null> {
    const match = await client.deliveryZoneCity.findUnique({
      where: { cityNormalized },
      include: { zone: { include: zoneWithCities } },
    });
    return match?.zone ?? null;
  },

  async findDefault(client: DbClient = prisma): Promise<DeliveryZoneRecord | null> {
    return client.deliveryZone.findFirst({ where: { isDefault: true }, include: zoneWithCities });
  },

  async countAll(): Promise<number> {
    return prisma.deliveryZone.count();
  },

  async create(
    client: DbClient,
    input: DeliveryZoneScalarInput & { isDefault: boolean; cities: string[] },
  ): Promise<DeliveryZoneRecord> {
    const { cities, ...scalars } = input;
    return client.deliveryZone.create({
      data: {
        ...scalars,
        cities: {
          create: cities.map((city) => ({ city, cityNormalized: normalizeCityName(city) })),
        },
      },
      include: zoneWithCities,
    });
  },

  async update(
    client: DbClient,
    id: string,
    input: Partial<DeliveryZoneScalarInput> & { cities?: string[] },
  ): Promise<DeliveryZoneRecord> {
    const { cities, ...scalars } = input;

    if (Object.keys(scalars).length > 0) {
      await client.deliveryZone.update({ where: { id }, data: scalars });
    }

    if (cities !== undefined) {
      await client.deliveryZoneCity.deleteMany({ where: { zoneId: id } });
      if (cities.length > 0) {
        await client.deliveryZoneCity.createMany({
          data: cities.map((city) => ({
            zoneId: id,
            city,
            cityNormalized: normalizeCityName(city),
          })),
        });
      }
    }

    return client.deliveryZone.findUniqueOrThrow({ where: { id }, include: zoneWithCities });
  },

  async setDefault(client: DbClient, zoneId: string): Promise<void> {
    await client.deliveryZone.updateMany({
      where: { isDefault: true, id: { not: zoneId } },
      data: { isDefault: false },
    });
    await client.deliveryZone.update({ where: { id: zoneId }, data: { isDefault: true } });
  },

  async delete(id: string): Promise<void> {
    await prisma.deliveryZone.delete({ where: { id } });
  },

  async recordHistory(
    client: DbClient,
    input: {
      zoneId: string;
      changedById: string;
      oldValues: DeliveryZoneSnapshot;
      newValues: DeliveryZoneSnapshot;
    },
  ): Promise<void> {
    await client.deliveryZoneHistory.create({
      data: {
        zoneId: input.zoneId,
        changedById: input.changedById,
        oldValues: input.oldValues as Prisma.InputJsonValue,
        newValues: input.newValues as Prisma.InputJsonValue,
      },
    });
  },

  async listHistory(params: { cursor?: string; limit: number }) {
    return prisma.deliveryZoneHistory.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { changedBy: { select: { name: true } }, zone: { select: { name: true } } },
    });
  },
};
