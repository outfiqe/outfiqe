import { prisma } from "#db/prisma.js";
import type { ProductType } from "#generated/prisma/enums.js";

import type { CreateSizeOptionInput, SizeOptionRecord } from "./size-option.types.js";

export const sizeOptionRepository = {
  async create(input: CreateSizeOptionInput): Promise<SizeOptionRecord> {
    return prisma.sizeOption.create({ data: input });
  },

  async delete(id: string): Promise<boolean> {
    const result = await prisma.sizeOption.deleteMany({ where: { id } });
    return result.count > 0;
  },

  async listAll(): Promise<SizeOptionRecord[]> {
    return prisma.sizeOption.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async listByType(type: ProductType): Promise<SizeOptionRecord[]> {
    return prisma.sizeOption.findMany({
      where: { type },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async findManyByIds(ids: string[]): Promise<SizeOptionRecord[]> {
    return prisma.sizeOption.findMany({ where: { id: { in: ids } } });
  },
};
