import { prisma } from "#db/prisma.js";

import type { OwnedSizeStandardLabel, SizeStandardView } from "./sizeStandard.types.js";

const sizeStandardViewSelect = {
  id: true,
  name: true,
  labels: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true } },
} as const;

export const sizeStandardRepository = {
  async listActiveForBrand(brandId: string): Promise<SizeStandardView[]> {
    return prisma.brandSizeStandard.findMany({
      where: { brandId, archivedAt: null },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      select: sizeStandardViewSelect,
    });
  },

  async findActiveForBrand(brandId: string, standardId: string): Promise<SizeStandardView | null> {
    return prisma.brandSizeStandard.findFirst({
      where: { id: standardId, brandId, archivedAt: null },
      select: sizeStandardViewSelect,
    });
  },

  async create(brandId: string, name: string, labels: string[]): Promise<SizeStandardView> {
    return prisma.brandSizeStandard.create({
      data: {
        brandId,
        name,
        labels: { create: labels.map((label, sortOrder) => ({ label, sortOrder })) },
      },
      select: sizeStandardViewSelect,
    });
  },

  async update(
    standardId: string,
    { name, labels }: { name?: string; labels?: string[] },
  ): Promise<SizeStandardView> {
    return prisma.$transaction(async (transaction) => {
      if (labels) {
        await transaction.brandSizeStandardLabel.deleteMany({
          where: { standardId, label: { notIn: labels } },
        });
        for (const [sortOrder, label] of labels.entries()) {
          await transaction.brandSizeStandardLabel.upsert({
            where: { standardId_label: { standardId, label } },
            create: { standardId, label, sortOrder },
            update: { sortOrder },
          });
        }
      }

      return transaction.brandSizeStandard.update({
        where: { id: standardId },
        data: { name, updatedAt: new Date() },
        select: sizeStandardViewSelect,
      });
    });
  },

  async archive(standardId: string): Promise<void> {
    await prisma.brandSizeStandard.update({
      where: { id: standardId },
      data: { archivedAt: new Date() },
    });
  },

  async findOwnedLabels(
    brandId: string,
    standardId: string,
    labelIds: string[],
  ): Promise<OwnedSizeStandardLabel[]> {
    return prisma.brandSizeStandardLabel.findMany({
      where: {
        id: { in: labelIds },
        standard: { id: standardId, brandId, archivedAt: null },
      },
      select: { id: true, label: true, sortOrder: true },
    });
  },
};
