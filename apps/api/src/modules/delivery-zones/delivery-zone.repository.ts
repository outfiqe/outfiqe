import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { normalizeCityName } from "#lib/city.utils.js";
import type { DbClient } from "#types/db.types.js";

import type { DeliveryZoneRecord, DeliveryZoneSnapshot } from "./delivery-zone.types.js";

const zoneWithCities = { cities: true } satisfies Prisma.DeliveryZoneInclude;

type DeliveryZoneScalarInput = {
  name: string;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  codHandlingFee: number;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
};

const toCityRows = (cities: string[], countryCode: string) =>
  cities.map((city) => ({ city, cityNormalized: normalizeCityName(city), countryCode }));

export const deliveryZoneRepository = {
  async listAll(): Promise<DeliveryZoneRecord[]> {
    return prisma.deliveryZone.findMany({
      orderBy: [{ countryCode: "asc" }, { isDefault: "desc" }, { name: "asc" }],
      include: zoneWithCities,
    });
  },

  async findById(id: string, client: DbClient = prisma): Promise<DeliveryZoneRecord | null> {
    return client.deliveryZone.findUnique({ where: { id }, include: zoneWithCities });
  },

  async searchCities(query: string, limit: number, countryCode: string) {
    return prisma.deliveryZoneCity.findMany({
      where: { countryCode, city: { contains: query, mode: "insensitive" } },
      orderBy: { city: "asc" },
      take: limit,
      include: { zone: true },
    });
  },

  async findByCityNormalized(
    countryCode: string,
    cityNormalized: string,
    client: DbClient = prisma,
  ): Promise<DeliveryZoneRecord | null> {
    const match = await client.deliveryZoneCity.findUnique({
      where: { countryCode_cityNormalized: { countryCode, cityNormalized } },
      include: { zone: { include: zoneWithCities } },
    });
    return match?.zone ?? null;
  },

  async findDefault(
    countryCode: string,
    client: DbClient = prisma,
  ): Promise<DeliveryZoneRecord | null> {
    return client.deliveryZone.findFirst({
      where: { isDefault: true, countryCode },
      include: zoneWithCities,
    });
  },

  async countForCountry(countryCode: string): Promise<number> {
    return prisma.deliveryZone.count({ where: { countryCode } });
  },

  async create(
    client: DbClient,
    input: DeliveryZoneScalarInput & { countryCode: string; isDefault: boolean; cities: string[] },
  ): Promise<DeliveryZoneRecord> {
    const { cities, ...scalars } = input;
    return client.deliveryZone.create({
      data: { ...scalars, cities: { create: toCityRows(cities, input.countryCode) } },
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
      const { countryCode } = await client.deliveryZone.findUniqueOrThrow({
        where: { id },
        select: { countryCode: true },
      });
      await client.deliveryZoneCity.deleteMany({ where: { zoneId: id } });
      if (cities.length > 0) {
        await client.deliveryZoneCity.createMany({
          data: toCityRows(cities, countryCode).map((cityRow) => ({ ...cityRow, zoneId: id })),
        });
      }
    }

    return client.deliveryZone.findUniqueOrThrow({ where: { id }, include: zoneWithCities });
  },

  async setDefault(client: DbClient, zoneId: string, countryCode: string): Promise<void> {
    await client.deliveryZone.updateMany({
      where: { isDefault: true, countryCode, id: { not: zoneId } },
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
