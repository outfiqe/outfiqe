import { prisma } from "#db/prisma.js";
import { CategoryStatus, ProductStatus } from "#generated/prisma/enums.js";

import type {
  CategoryRecord,
  CategoryWithProductCount,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.types.js";

const withProductCount = {
  _count: { select: { products: { where: { status: ProductStatus.APPROVED } } } },
};

export const categoryRepository = {
  async create(input: CreateCategoryInput): Promise<CategoryWithProductCount> {
    const { _count, ...category } = await prisma.category.create({
      data: input,
      include: withProductCount,
    });
    return { ...category, productCount: _count.products };
  },

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryWithProductCount> {
    const { _count, ...category } = await prisma.category.update({
      where: { id },
      data: input,
      include: withProductCount,
    });
    return { ...category, productCount: _count.products };
  },

  async findById(id: string): Promise<CategoryRecord | null> {
    return prisma.category.findUnique({ where: { id } });
  },

  async findBySlug(slug: string): Promise<CategoryRecord | null> {
    return prisma.category.findUnique({ where: { slug } });
  },

  async findManyBySlugs(slugs: string[]): Promise<CategoryRecord[]> {
    return prisma.category.findMany({ where: { slug: { in: slugs } } });
  },

  async listAll(): Promise<CategoryWithProductCount[]> {
    const rows = await prisma.category.findMany({
      include: withProductCount,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
  },

  async listPublic(): Promise<CategoryWithProductCount[]> {
    const rows = await prisma.category.findMany({
      where: { status: CategoryStatus.PUBLISHED },
      include: withProductCount,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
  },
};
