import { prisma } from "#db/prisma.js";

import type { CreateSizeOptionInput, SizeOptionRecord } from "./size-option.types.js";

const withProductTypeSlug = { productType: { select: { slug: true } } };

export const sizeOptionRepository = {
  async create(input: CreateSizeOptionInput): Promise<SizeOptionRecord> {
    return prisma.sizeOption.create({ data: input, include: withProductTypeSlug });
  },

  async delete(id: string): Promise<boolean> {
    const result = await prisma.sizeOption.deleteMany({ where: { id } });
    return result.count > 0;
  },

  async listAll(): Promise<SizeOptionRecord[]> {
    return prisma.sizeOption.findMany({
      include: withProductTypeSlug,
      orderBy: [{ productType: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async listByProductTypeId(productTypeId: string): Promise<SizeOptionRecord[]> {
    return prisma.sizeOption.findMany({
      where: { productTypeId },
      include: withProductTypeSlug,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async findManyByIds(ids: string[]): Promise<SizeOptionRecord[]> {
    return prisma.sizeOption.findMany({ where: { id: { in: ids } }, include: withProductTypeSlug });
  },
};
