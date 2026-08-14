import { Prisma } from "#generated/prisma/client.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { toPublicProduct } from "#modules/products/product.service.js";
import type { PublicProduct } from "#modules/products/product.types.js";

import { collectionRepository } from "./collection.repository.js";
import type {
  CreateCollectionBody,
  ListCollectionProductsQuery,
  ListCollectionsQuery,
  SetCollectionProductsBody,
  UpdateCollectionBody,
} from "./collection.schemas.js";
import type {
  CollectionRecord,
  CollectionWithProductCount,
  PublicCollection,
  PublicCollectionPage,
  PublicCollectionProductPage,
} from "./collection.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const withSlugConflictHandling = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "SLUG_TAKEN",
        "A collection with this slug already exists.",
        CONFLICT_STATUS,
      );
    }
    throw error;
  }
};

const toPublicCollection = (collection: CollectionWithProductCount): PublicCollection => ({
  id: collection.id,
  name: collection.name,
  slug: collection.slug,
  description: collection.description,
  imageUrl: collection.imageUrl,
  productCount: collection.productCount,
});

const requireCollection = async (id: string): Promise<CollectionRecord> => {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw new AppError("NOT_FOUND", "Collection not found.", NOT_FOUND_STATUS);
  return collection;
};

export const collectionService = {
  async create(input: CreateCollectionBody): Promise<CollectionWithProductCount> {
    return withSlugConflictHandling(() => collectionRepository.create(input));
  },

  async update(id: string, input: UpdateCollectionBody): Promise<CollectionWithProductCount> {
    await requireCollection(id);
    return withSlugConflictHandling(() => collectionRepository.update(id, input));
  },

  async setProducts(id: string, body: SetCollectionProductsBody): Promise<void> {
    await requireCollection(id);
    await collectionRepository.setProducts(id, body.productIds);
  },

  async listAll(): Promise<CollectionWithProductCount[]> {
    return collectionRepository.listAll();
  },

  async listProductsForAdmin(id: string): Promise<PublicProduct[]> {
    await requireCollection(id);
    const rows = await collectionRepository.listProductsForAdmin(id);
    return rows.map(toPublicProduct);
  },

  async listPublic(query: ListCollectionsQuery): Promise<PublicCollectionPage> {
    const [rows, total] = await Promise.all([
      collectionRepository.listPublic({ cursor: query.cursor, limit: query.limit }),
      collectionRepository.countPublic(),
    ]);

    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return {
      collections: items.map(toPublicCollection),
      nextCursor,
      total,
    };
  },

  async getPublicBySlug(slug: string): Promise<PublicCollection> {
    const collection = await collectionRepository.findPublicBySlug(slug);
    if (!collection) throw new AppError("NOT_FOUND", "Collection not found.", NOT_FOUND_STATUS);
    return toPublicCollection(collection);
  },

  async listPublicProducts(
    slug: string,
    query: ListCollectionProductsQuery,
  ): Promise<PublicCollectionProductPage> {
    const collection = await collectionRepository.findPublicBySlug(slug);
    if (!collection) throw new AppError("NOT_FOUND", "Collection not found.", NOT_FOUND_STATUS);

    const [rows, total] = await Promise.all([
      collectionRepository.listPublicProducts({
        collectionId: collection.id,
        cursor: query.cursor,
        limit: query.limit,
      }),
      collectionRepository.countPublicProducts(collection.id),
    ]);

    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return {
      products: items.map(toPublicProduct),
      nextCursor,
      total,
    };
  },
};
