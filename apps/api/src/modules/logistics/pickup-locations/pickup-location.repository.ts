import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

export type PickupLocationRecord = Prisma.BrandPickupLocationGetPayload<object>;

type PickupLocationWriteFields = Omit<
  Prisma.BrandPickupLocationUncheckedCreateInput,
  "id" | "brandId" | "isDefault" | "isActive" | "createdAt" | "updatedAt"
>;

export const logisticsPickupLocationRepository = {
  async listActiveForBrand(brandId: string): Promise<PickupLocationRecord[]> {
    return prisma.brandPickupLocation.findMany({
      where: { brandId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  },

  async countActiveForBrand(brandId: string, client: DbClient = prisma): Promise<number> {
    return client.brandPickupLocation.count({ where: { brandId, isActive: true } });
  },

  async findActiveForBrand(
    brandId: string,
    locationId: string,
    client: DbClient = prisma,
  ): Promise<PickupLocationRecord | null> {
    return client.brandPickupLocation.findFirst({
      where: { id: locationId, brandId, isActive: true },
    });
  },

  async createLocation(
    client: DbClient,
    brandId: string,
    fields: PickupLocationWriteFields,
    isDefault: boolean,
  ): Promise<PickupLocationRecord> {
    return client.brandPickupLocation.create({ data: { ...fields, brandId, isDefault } });
  },

  async updateLocation(
    locationId: string,
    fields: PickupLocationWriteFields,
  ): Promise<PickupLocationRecord> {
    return prisma.brandPickupLocation.update({ where: { id: locationId }, data: fields });
  },

  async clearBrandDefault(client: DbClient, brandId: string): Promise<void> {
    await client.brandPickupLocation.updateMany({
      where: { brandId, isDefault: true },
      data: { isDefault: false },
    });
  },

  async markDefault(client: DbClient, locationId: string): Promise<void> {
    await client.brandPickupLocation.update({
      where: { id: locationId },
      data: { isDefault: true },
    });
  },

  async deactivateLocation(client: DbClient, locationId: string): Promise<void> {
    await client.brandPickupLocation.update({
      where: { id: locationId },
      data: { isActive: false, isDefault: false },
    });
  },

  async findOldestActiveLocation(
    client: DbClient,
    brandId: string,
  ): Promise<{ id: string } | null> {
    return client.brandPickupLocation.findFirst({
      where: { brandId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
  },
};
