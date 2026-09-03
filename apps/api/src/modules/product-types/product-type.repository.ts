import { prisma } from "#db/prisma.js";
import { ProductStatus } from "#generated/prisma/enums.js";

import type {
  CreateProductTypeInput,
  ProductTypeRecord,
  ProductTypeWithCounts,
  UpdateProductTypeInput,
} from "./product-type.types.js";

const withCounts = {
  _count: {
    select: {
      products: { where: { status: ProductStatus.APPROVED, deletedAt: null } },
      sizeOptions: true,
    },
  },
};

type RowWithCounts = ProductTypeRecord & {
  _count: { products: number; sizeOptions: number };
};

const toWithCounts = ({ _count, ...productType }: RowWithCounts): ProductTypeWithCounts => ({
  ...productType,
  productCount: _count.products,
  sizeOptionCount: _count.sizeOptions,
});

export const productTypeRepository = {
  async create(input: CreateProductTypeInput): Promise<ProductTypeWithCounts> {
    const row = await prisma.productType.create({ data: input, include: withCounts });
    return toWithCounts(row);
  },

  async update(id: string, input: UpdateProductTypeInput): Promise<ProductTypeWithCounts> {
    const row = await prisma.productType.update({
      where: { id },
      data: input,
      include: withCounts,
    });
    return toWithCounts(row);
  },

  async findById(id: string): Promise<ProductTypeRecord | null> {
    return prisma.productType.findUnique({ where: { id } });
  },

  async findBySlug(slug: string): Promise<ProductTypeRecord | null> {
    return prisma.productType.findUnique({ where: { slug } });
  },

  async findManyBySlugs(slugs: string[]): Promise<ProductTypeRecord[]> {
    return prisma.productType.findMany({ where: { slug: { in: slugs } } });
  },

  async listAll(): Promise<ProductTypeWithCounts[]> {
    const rows = await prisma.productType.findMany({
      include: withCounts,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toWithCounts);
  },

  async listActive(): Promise<ProductTypeRecord[]> {
    return prisma.productType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async listAssignable(): Promise<ProductTypeRecord[]> {
    return prisma.productType.findMany({
      where: { isActive: true, sizeOptions: { some: {} } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async listIds(): Promise<string[]> {
    const rows = await prisma.productType.findMany({ select: { id: true } });
    return rows.map((row) => row.id);
  },

  async reorder(orderedIds: string[]): Promise<void> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.productType.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  },
};
