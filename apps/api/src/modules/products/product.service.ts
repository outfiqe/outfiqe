import { PRODUCT_SORT } from "@outfiqe/utils";
import { LRUCache } from "lru-cache";

import { prisma } from "#db/prisma.js";
import { productApprovedTemplate, productRejectedTemplate } from "#email-templates/templates.js";
import { ProductStatus } from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import { isForeignKeyConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { categoryService } from "#modules/categories/category.service.js";
import { productTypeService } from "#modules/product-types/product-type.service.js";
import { sizeOptionService } from "#modules/size-options/size-option.service.js";
import { trendingService } from "#modules/trending/trending.service.js";
import { wishlistRepository } from "#modules/wishlist/wishlist.repository.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { AUTOCOMPLETE_LIMIT, TRENDING_LIMIT } from "./product.constants.js";
import type { DbClient } from "./product.repository.js";
import { productRepository } from "./product.repository.js";
import type {
  AdjustStockBody,
  AutocompleteQuery,
  CreateProductBody,
  ListBrandProductsQuery,
  ListMineProductsQuery,
  ListPublicProductsQuery,
  ListReviewProductsQuery,
  UpdateProductBody,
} from "./product.schemas.js";
import type {
  BrandProductSize,
  CreateProductSizeInput,
  ProductBrandSummary,
  ProductBrandSummaryPage,
  ProductRecord,
  ProductReviewPage,
  ProductSearchCursor,
  ProductSuggestion,
  PublicProduct,
  PublicProductDetail,
  PublicProductPage,
} from "./product.types.js";
import { isUuid, toBrandSummary, toPublicProduct, toSuggestion } from "./product.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const BAD_REQUEST_STATUS = 400;

const AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES = 500;
const AUTOCOMPLETE_CACHE_NAMESPACE = "product-autocomplete";
const MS_PER_SECOND = 1000;

const autocompleteMemoryCache = new LRUCache<string, ProductSuggestion[]>({
  max: AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL.PRODUCT_AUTOCOMPLETE * MS_PER_SECOND,
});

const requireOwnedProduct = async (productId: string, brandId: string): Promise<ProductRecord> => {
  const product = await productRepository.findById(productId);
  if (!product || product.brandId !== brandId || product.deletedAt) {
    throw new AppError("NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);
  }
  return product;
};

const requirePendingProduct = async (productId: string): Promise<ProductRecord> => {
  const product = await productRepository.findById(productId);
  if (!product || product.deletedAt) {
    throw new AppError("NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);
  }
  if (product.status !== ProductStatus.PENDING) {
    throw new AppError(
      "ALREADY_REVIEWED",
      "This product has already been reviewed.",
      CONFLICT_STATUS,
    );
  }
  return product;
};

const notifyBrand = async (
  product: ProductRecord,
  template: (name: string) => { subject: string; html: string },
  fallbackBody: string,
): Promise<void> => {
  const brand = await brandRepository.findById(product.brandId);
  if (!brand) return;

  const { subject, html } = template(product.name);
  await sendEmail({ to: brand.email, subject, body: fallbackBody, html });
};

export const productService = {
  async create(
    userId: string,
    { categories: categorySlugs, name, price, type, imageUrls, lowStock, sizes }: CreateProductBody,
  ): Promise<ProductBrandSummary> {
    const brandId = await requireBrandId(userId);
    const productType = await productTypeService.getActiveBySlug(type);
    const categories = await categoryService.getManyBySlugs(categorySlugs);
    const sizeOptions = await sizeOptionService.getManyByIds(
      sizes.map((size) => size.sizeOptionId),
      productType.id,
    );
    const sizeOptionById = new Map(sizeOptions.map((sizeOption) => [sizeOption.id, sizeOption]));

    const product = await productRepository.create({
      brandId,
      name,
      price,
      productTypeId: productType.id,
      categoryIds: categories.map((category) => category.id),
      imageUrls,
      lowStock,
      sizes: sizes.map(({ sizeOptionId, stock }, sortOrder) => {
        const sizeOption = sizeOptionById.get(sizeOptionId);
        if (!sizeOption) {
          throw new AppError(
            "SIZE_OPTION_NOT_FOUND",
            "One or more selected sizes weren't found.",
            NOT_FOUND_STATUS,
          );
        }
        return { label: sizeOption.label, stock, sortOrder };
      }),
    });

    return toBrandSummary(product);
  },

  async update(
    userId: string,
    productId: string,
    { categories, name, price, type, imageUrls, lowStock, sizes }: UpdateProductBody,
  ): Promise<ProductBrandSummary> {
    const brandId = await requireBrandId(userId);
    const product = await requireOwnedProduct(productId, brandId);

    const categoryIds = categories
      ? (await categoryService.getManyBySlugs(categories)).map((category) => category.id)
      : undefined;

    const targetProductType = type ? await productTypeService.getActiveBySlug(type) : undefined;
    const isTypeChange =
      targetProductType !== undefined && targetProductType.id !== product.productTypeId;

    let sizeChanges: CreateProductSizeInput[] | undefined;
    if (isTypeChange) {
      if (!sizes || sizes.length === 0) {
        throw new AppError(
          "SIZES_REQUIRED",
          "Add at least one size for the new product type.",
          BAD_REQUEST_STATUS,
        );
      }

      const sizeOptions = await sizeOptionService.getManyByIds(
        sizes.map((size) => size.sizeOptionId),
        targetProductType.id,
      );
      const sizeOptionById = new Map(sizeOptions.map((sizeOption) => [sizeOption.id, sizeOption]));

      sizeChanges = sizes.map(({ sizeOptionId, stock }, sortOrder) => {
        const sizeOption = sizeOptionById.get(sizeOptionId);
        if (!sizeOption) {
          throw new AppError(
            "SIZE_OPTION_NOT_FOUND",
            "One or more selected sizes weren't found.",
            NOT_FOUND_STATUS,
          );
        }
        return { label: sizeOption.label, stock, sortOrder };
      });
    }

    try {
      const product = await productRepository.update(productId, {
        name,
        price,
        productTypeId: targetProductType?.id,
        categoryIds,
        imageUrls,
        lowStock,
        sizes: sizeChanges,
      });
      return toBrandSummary(product);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new AppError(
          "SIZES_IN_USE",
          "Can't change product type — some of its current sizes already have orders and can't be removed.",
          CONFLICT_STATUS,
        );
      }
      throw error;
    }
  },

  async delete(userId: string, productId: string): Promise<void> {
    const brandId = await requireBrandId(userId);
    await requireOwnedProduct(productId, brandId);
    await productRepository.softDelete(productId);
  },

  async listMine(
    userId: string,
    { cursor, limit }: ListMineProductsQuery,
  ): Promise<ProductBrandSummaryPage> {
    const brandId = await requireBrandId(userId);
    const rows = await productRepository.listByBrandId(brandId, { cursor, limit });

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return { products: pagedProducts.map(toBrandSummary), nextCursor };
  },

  async listForReview({
    status: rawStatus,
    cursor,
    limit,
  }: ListReviewProductsQuery): Promise<ProductReviewPage> {
    const status = rawStatus ?? ProductStatus.PENDING;
    const rows = await productRepository.listForReview(status, { cursor, limit });

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return {
      products: pagedProducts.map(({ categories, ...rest }) => ({
        ...rest,
        categories: categories.map((category) => category.name),
      })),
      nextCursor,
    };
  },

  async autocomplete({ q }: AutocompleteQuery): Promise<ProductSuggestion[]> {
    const normalizedQuery = q.trim().toLowerCase();

    const memoryHit = autocompleteMemoryCache.get(normalizedQuery);
    if (memoryHit) return memoryHit;

    const cacheKey = redisKeys.cache(AUTOCOMPLETE_CACHE_NAMESPACE, normalizedQuery);
    try {
      const cached = await cacheService.get<ProductSuggestion[]>(cacheKey);
      if (cached) {
        autocompleteMemoryCache.set(normalizedQuery, cached);
        return cached;
      }
    } catch (error) {
      logger.warn(`Cache read failed for "${cacheKey}": ${describeError(error)}`);
    }

    const { ids } = await productRepository.searchProductIds({
      query: q,
      limit: AUTOCOMPLETE_LIMIT,
      offset: 0,
    });
    const rows = await productRepository.listApprovedByIds(ids);
    const suggestions = rows.map(toSuggestion);

    autocompleteMemoryCache.set(normalizedQuery, suggestions);
    try {
      await cacheService.set(cacheKey, suggestions, CACHE_TTL.PRODUCT_AUTOCOMPLETE);
    } catch (error) {
      logger.warn(`Cache write failed for "${cacheKey}": ${describeError(error)}`);
    }

    return suggestions;
  },

  async listPublic({
    type: typeSlug,
    category,
    q,
    sort,
    minPrice,
    maxPrice,
    inStock,
    cursor,
    limit,
  }: ListPublicProductsQuery): Promise<PublicProductPage> {
    const productTypeId = typeSlug ? (await productTypeService.getBySlug(typeSlug)).id : undefined;
    const categoryId = category ? (await categoryService.getBySlug(category)).id : undefined;

    if (q) {
      const offset = decodeCursor<ProductSearchCursor>(cursor)?.offset ?? 0;
      const { ids, total, brandCount } = await productRepository.searchProductIds({
        query: q,
        limit,
        offset,
        categoryId,
        productTypeId,
        minPrice,
        maxPrice,
        inStockOnly: inStock,
      });
      const rows = await productRepository.listApprovedByIds(ids);
      const nextOffset = offset + ids.length;
      const nextCursor =
        nextOffset < total ? encodeCursor<ProductSearchCursor>({ offset: nextOffset }) : null;

      return { products: rows.map(toPublicProduct), nextCursor, total, brandCount };
    }

    const isUnfilteredTrendingBrowse =
      sort === PRODUCT_SORT.TRENDING &&
      !categoryId &&
      !productTypeId &&
      !minPrice &&
      !maxPrice &&
      !inStock;

    if (isUnfilteredTrendingBrowse) {
      const { ids, nextCursor } = await trendingService.listTrendingProductIds({ cursor, limit });
      const isColdStart = ids.length === 0 && !cursor;

      if (!isColdStart) {
        const [rows, counts] = await Promise.all([
          productRepository.listApprovedByIds(ids),
          productRepository.countPublic({}),
        ]);

        return {
          products: rows.map(toPublicProduct),
          nextCursor,
          total: counts.total,
          brandCount: counts.brandCount,
        };
      }
    }

    const keysetCursor = cursor && isUuid(cursor) ? cursor : undefined;
    const filter = { categoryId, productTypeId, minPrice, maxPrice, inStockOnly: inStock, sort };
    const [rows, counts] = await Promise.all([
      productRepository.listPublic({ ...filter, cursor: keysetCursor, limit }),
      productRepository.countPublic(filter),
    ]);

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return {
      products: pagedProducts.map(toPublicProduct),
      nextCursor,
      total: counts.total,
      brandCount: counts.brandCount,
    };
  },

  async getPublicDetail(id: string, viewerId?: string): Promise<PublicProductDetail> {
    const product = await productRepository.findPublicById(id);
    if (!product) throw new AppError("NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);

    const { brandId, brand, sizes, images, wornByCount } = product;

    const [seenOnCreators, isSaved] = await Promise.all([
      productRepository.listSeenOnCreators(id),
      viewerId ? wishlistRepository.isSaved(viewerId, id) : false,
    ]);

    return {
      ...toPublicProduct(product),
      brand: { id: brandId, name: brand.name },
      sizes,
      images: images.map((image) => image.url),
      wornByCount,
      seenOnCreators,
      isSaved,
    };
  },

  async recountWornBy(productId: string): Promise<void> {
    const count = await productRepository.countDistinctApprovedCreators(productId);
    await productRepository.updateWornByCount(productId, count);
  },

  async recountWornByForCreator(creatorId: string): Promise<void> {
    const productIds = await productRepository.listProductIdsTaggedByCreator(creatorId);
    await Promise.all(productIds.map((productId) => productService.recountWornBy(productId)));
  },

  async recomputeRatingSummary(productId: string): Promise<void> {
    await productRepository.refreshRatingSummary(productId);
  },

  async listPublicByBrand(
    brandId: string,
    { type: typeSlug, cursor, limit }: ListBrandProductsQuery,
  ): Promise<PublicProductPage> {
    const productTypeId = typeSlug ? (await productTypeService.getBySlug(typeSlug)).id : undefined;

    const [rows, counts] = await Promise.all([
      productRepository.listPublic({ brandId, productTypeId, cursor, limit }),
      productRepository.countPublic({ brandId, productTypeId }),
    ]);

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return {
      products: pagedProducts.map(toPublicProduct),
      nextCursor,
      total: counts.total,
      brandCount: counts.brandCount,
    };
  },

  async listTrending(): Promise<PublicProduct[]> {
    const rankedIds = await trendingService.getTrendingProductIds(TRENDING_LIMIT);
    const rows =
      rankedIds.length > 0
        ? await productRepository.listApprovedByIds(rankedIds)
        : await productRepository.listTrending();
    return rows.map(toPublicProduct);
  },

  async listNewArrivals(): Promise<PublicProduct[]> {
    return (await productRepository.listNewArrivals()).map(toPublicProduct);
  },

  async decrementStockForItems(
    client: DbClient,
    lines: { sizeId: string; qty: number }[],
  ): Promise<string[]> {
    const sorted = [...lines].sort((a, b) => a.sizeId.localeCompare(b.sizeId));
    const insufficientSizeIds: string[] = [];
    for (const line of sorted) {
      const ok = await productRepository.decrementStock(client, line.sizeId, line.qty);
      if (!ok) insufficientSizeIds.push(line.sizeId);
    }
    return insufficientSizeIds;
  },

  async restoreStockForItems(
    client: DbClient,
    lines: { sizeId: string; qty: number }[],
  ): Promise<void> {
    const sorted = [...lines].sort((a, b) => a.sizeId.localeCompare(b.sizeId));
    for (const line of sorted) {
      await productRepository.restoreStock(client, line.sizeId, line.qty);
    }
  },

  async adjustStock(
    userId: string,
    productId: string,
    { adjustments }: AdjustStockBody,
  ): Promise<BrandProductSize[]> {
    const brandId = await requireBrandId(userId);
    await requireOwnedProduct(productId, brandId);

    const sizeIds = adjustments.map((adjustment) => adjustment.sizeId);
    const ownedSizeIds = new Set(await productRepository.findSizeIdsForProduct(productId, sizeIds));
    const unknownSizeId = sizeIds.find((sizeId) => !ownedSizeIds.has(sizeId));
    if (unknownSizeId) {
      throw new AppError(
        "SIZE_NOT_FOUND",
        "One or more sizes weren't found on this product.",
        NOT_FOUND_STATUS,
      );
    }

    const sorted = [...adjustments].sort((a, b) => a.sizeId.localeCompare(b.sizeId));

    await prisma.$transaction(async (tx) => {
      for (const { sizeId, delta } of sorted) {
        if (delta > 0) {
          await productRepository.restoreStock(tx, sizeId, delta);
          continue;
        }

        const ok = await productRepository.decrementStock(tx, sizeId, -delta);
        if (!ok) {
          throw new AppError(
            "INSUFFICIENT_STOCK",
            "Can't reduce stock below what's available.",
            BAD_REQUEST_STATUS,
            { sizeId },
          );
        }
      }
    });

    return productRepository.listSizesForProduct(productId);
  },

  async approve(productId: string, adminUserId: string): Promise<void> {
    const product = await requirePendingProduct(productId);
    await productRepository.approve(productId, adminUserId);
    await notifyBrand(product, productApprovedTemplate, `${product.name} is now live on Outfiqe.`);

    logger.info(`Product approved: ${productId} by admin ${adminUserId}`);
  },

  async reject(productId: string, adminUserId: string): Promise<void> {
    const product = await requirePendingProduct(productId);
    await productRepository.reject(productId, adminUserId);
    await notifyBrand(
      product,
      productRejectedTemplate,
      `${product.name} wasn't approved to list on Outfiqe.`,
    );

    logger.info(`Product rejected: ${productId} by admin ${adminUserId}`);
  },
};
