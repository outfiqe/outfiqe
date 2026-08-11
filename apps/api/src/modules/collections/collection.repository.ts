import { prisma } from "../../shared/db/prisma.js";

import { CollectionStatus, ProductStatus } from "../../generated/prisma/enums.js";
import type {
  CollectionRecord,
  CollectionWithProductCount,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "./collection.types.js";
import type { ProductWithBrand } from "../products/product.types.js";

const withProductCount = {
  _count: { select: { products: { where: { product: { status: ProductStatus.APPROVED } } } } },
};

const withProductAndBrand = {
  product: {
    include: {
      brand: { select: { name: true } },
      category: { select: { slug: true, name: true } },
    },
  },
};

export const collectionRepository = {
  async create(input: CreateCollectionInput): Promise<CollectionWithProductCount> {
    const { _count, ...collection } = await prisma.collection.create({
      data: input,
      include: withProductCount,
    });
    return { ...collection, productCount: _count.products };
  },

  async update(id: string, input: UpdateCollectionInput): Promise<CollectionWithProductCount> {
    const { _count, ...collection } = await prisma.collection.update({
      where: { id },
      data: input,
      include: withProductCount,
    });
    return { ...collection, productCount: _count.products };
  },

  async findById(id: string): Promise<CollectionRecord | null> {
    return prisma.collection.findUnique({ where: { id } });
  },

  async listAll(): Promise<CollectionWithProductCount[]> {
    const rows = await prisma.collection.findMany({
      include: withProductCount,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(({ _count, ...collection }) => ({
      ...collection,
      productCount: _count.products,
    }));
  },

  async listPublic(params: {
    cursor?: string;
    limit: number;
  }): Promise<CollectionWithProductCount[]> {
    const rows = await prisma.collection.findMany({
      where: { status: CollectionStatus.PUBLISHED },
      include: withProductCount,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return rows.map(({ _count, ...collection }) => ({
      ...collection,
      productCount: _count.products,
    }));
  },

  async countPublic(): Promise<number> {
    return prisma.collection.count({ where: { status: CollectionStatus.PUBLISHED } });
  },

  async findPublicBySlug(slug: string): Promise<CollectionWithProductCount | null> {
    const row = await prisma.collection.findFirst({
      where: { slug, status: CollectionStatus.PUBLISHED },
      include: withProductCount,
    });
    if (!row) return null;

    const { _count, ...collection } = row;
    return { ...collection, productCount: _count.products };
  },

  async listPublicProducts(params: {
    collectionId: string;
    cursor?: string;
    limit: number;
  }): Promise<ProductWithBrand[]> {
    const rows = await prisma.collectionProduct.findMany({
      where: { collectionId: params.collectionId, product: { status: ProductStatus.APPROVED } },
      include: withProductAndBrand,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: params.limit + 1,
      ...(params.cursor
        ? {
            cursor: {
              collectionId_productId: {
                collectionId: params.collectionId,
                productId: params.cursor,
              },
            },
            skip: 1,
          }
        : {}),
    });
    return rows.map((row) => row.product);
  },

  async countPublicProducts(collectionId: string): Promise<number> {
    return prisma.collectionProduct.count({
      where: { collectionId, product: { status: ProductStatus.APPROVED } },
    });
  },

  async listProductsForAdmin(collectionId: string): Promise<ProductWithBrand[]> {
    const rows = await prisma.collectionProduct.findMany({
      where: { collectionId },
      include: withProductAndBrand,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => row.product);
  },

  async setProducts(collectionId: string, productIds: string[]): Promise<void> {
    await prisma.$transaction([
      prisma.collectionProduct.deleteMany({ where: { collectionId } }),
      prisma.collectionProduct.createMany({
        data: productIds.map((productId, index) => ({
          collectionId,
          productId,
          sortOrder: index,
        })),
      }),
    ]);
  },
};
