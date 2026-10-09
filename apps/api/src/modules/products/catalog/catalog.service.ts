import { PRODUCT_SORT } from "@outfiqe/utils";
import { LRUCache } from "lru-cache";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { categoryService } from "#modules/categories/category.service.js";
import { productTypeService } from "#modules/product-types/product-type.service.js";
import { SALE_RAIL_LIMIT } from "#modules/sale/sale.constants.js";
import { saleService } from "#modules/sale/sale.service.js";
import { trendingService } from "#modules/trending/trending.service.js";
import { wishlistRepository } from "#modules/wishlist/wishlist.repository.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { AUTOCOMPLETE_LIMIT, TRENDING_LIMIT } from "../product.constants.js";
import type {
  AutocompleteQuery,
  ListBrandProductsQuery,
  ListPublicProductsQuery,
} from "../product.schemas.js";
import type {
  ProductSearchCursor,
  ProductSuggestion,
  PublicProduct,
  PublicProductDetail,
  PublicProductPage,
} from "../product.types.js";
import { isUuid, toPublicProduct, toSuggestion } from "../product.utils.js";
import { productSocialProofRepository } from "../social-proof/social-proof.repository.js";
import { productCatalogRepository } from "./catalog.repository.js";

const AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES = 500;
const AUTOCOMPLETE_CACHE_NAMESPACE = "product-autocomplete";
const MS_PER_SECOND = 1000;

const autocompleteMemoryCache = new LRUCache<string, ProductSuggestion[]>({
  max: AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL.PRODUCT_AUTOCOMPLETE * MS_PER_SECOND,
});

const hydrateSavedFlags = async (
  products: PublicProduct[],
  viewerId?: string,
): Promise<PublicProduct[]> => {
  if (!viewerId || products.length === 0) return products;

  const savedProductIds = await wishlistRepository.listSavedProductIds(
    viewerId,
    products.map((product) => product.id),
  );
  return products.map((product) => ({ ...product, isSaved: savedProductIds.has(product.id) }));
};

export const productCatalogService = {
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

    const { ids } = await productCatalogRepository.searchProductIds({
      query: q,
      limit: AUTOCOMPLETE_LIMIT,
      offset: 0,
    });
    const rows = await productCatalogRepository.listApprovedByIds(ids);
    const suggestions = rows.map(toSuggestion);

    autocompleteMemoryCache.set(normalizedQuery, suggestions);
    try {
      await cacheService.set(cacheKey, suggestions, CACHE_TTL.PRODUCT_AUTOCOMPLETE);
    } catch (error) {
      logger.warn(`Cache write failed for "${cacheKey}": ${describeError(error)}`);
    }

    return suggestions;
  },

  async listPublic(
    {
      type: typeSlug,
      category,
      q,
      sort,
      minPrice,
      maxPrice,
      inStock,
      thrift,
      cursor,
      limit,
    }: ListPublicProductsQuery,
    viewerId?: string,
  ): Promise<PublicProductPage> {
    const productTypeId = typeSlug ? (await productTypeService.getBySlug(typeSlug)).id : undefined;
    const categoryId = category ? (await categoryService.getBySlug(category)).id : undefined;

    if (q) {
      const offset = decodeCursor<ProductSearchCursor>(cursor)?.offset ?? 0;
      const { ids, total, brandCount } = await productCatalogRepository.searchProductIds({
        query: q,
        limit,
        offset,
        categoryId,
        productTypeId,
        minPrice,
        maxPrice,
        inStockOnly: inStock,
        thrift,
      });
      const rows = await productCatalogRepository.listApprovedByIds(ids);
      const nextOffset = offset + ids.length;
      const nextCursor =
        nextOffset < total ? encodeCursor<ProductSearchCursor>({ offset: nextOffset }) : null;

      const products = await hydrateSavedFlags(rows.map(toPublicProduct), viewerId);
      return { products, nextCursor, total, brandCount };
    }

    const isUnfilteredTrendingBrowse =
      sort === PRODUCT_SORT.TRENDING &&
      !categoryId &&
      !productTypeId &&
      !minPrice &&
      !maxPrice &&
      !inStock &&
      thrift === undefined;

    if (isUnfilteredTrendingBrowse) {
      const { ids, nextCursor } = await trendingService.listTrendingProductIds({ cursor, limit });
      const isColdStart = ids.length === 0 && !cursor;

      if (!isColdStart) {
        const [rows, counts] = await Promise.all([
          productCatalogRepository.listApprovedByIds(ids),
          productCatalogRepository.countPublic({}),
        ]);

        const products = await hydrateSavedFlags(rows.map(toPublicProduct), viewerId);
        return {
          products,
          nextCursor,
          total: counts.total,
          brandCount: counts.brandCount,
        };
      }
    }

    const isUnfilteredSaleBrowse =
      sort === PRODUCT_SORT.ON_SALE &&
      !categoryId &&
      !productTypeId &&
      !minPrice &&
      !maxPrice &&
      !inStock &&
      thrift === undefined;

    if (isUnfilteredSaleBrowse) {
      const { ids, nextCursor } = await saleService.listSaleProductIds({ cursor, limit });

      if (ids.length > 0 || cursor) {
        const [rows, counts] = await Promise.all([
          productCatalogRepository.listApprovedByIds(ids),
          productCatalogRepository.countPublic({ sort: PRODUCT_SORT.ON_SALE }),
        ]);

        const products = await hydrateSavedFlags(rows.map(toPublicProduct), viewerId);
        return {
          products,
          nextCursor,
          total: counts.total,
          brandCount: counts.brandCount,
        };
      }
    }

    const keysetCursor = cursor && isUuid(cursor) ? cursor : undefined;
    const filter = {
      categoryId,
      productTypeId,
      minPrice,
      maxPrice,
      inStockOnly: inStock,
      thrift,
      sort,
    };
    const [rows, counts] = await Promise.all([
      productCatalogRepository.listPublic({ ...filter, cursor: keysetCursor, limit }),
      productCatalogRepository.countPublic(filter),
    ]);

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    const products = await hydrateSavedFlags(pagedProducts.map(toPublicProduct), viewerId);
    return {
      products,
      nextCursor,
      total: counts.total,
      brandCount: counts.brandCount,
    };
  },

  async getPublicDetail(id: string, viewerId?: string): Promise<PublicProductDetail> {
    const product = await productCatalogRepository.findPublicById(id);
    if (!product) throw new AppError("NOT_FOUND", "Product not found.", HTTP_STATUS.NOT_FOUND);

    const { brandId, brand, sizes, images, wornByCount } = product;

    const [seenOnCreators, isSaved] = await Promise.all([
      productSocialProofRepository.listSeenOnCreators(id),
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

  async listPublicByBrand(
    brandId: string,
    { type: typeSlug, cursor, limit }: ListBrandProductsQuery,
    viewerId?: string,
  ): Promise<PublicProductPage> {
    const productTypeId = typeSlug ? (await productTypeService.getBySlug(typeSlug)).id : undefined;

    const [rows, counts] = await Promise.all([
      productCatalogRepository.listPublic({ brandId, productTypeId, cursor, limit }),
      productCatalogRepository.countPublic({ brandId, productTypeId }),
    ]);

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    const products = await hydrateSavedFlags(pagedProducts.map(toPublicProduct), viewerId);
    return {
      products,
      nextCursor,
      total: counts.total,
      brandCount: counts.brandCount,
    };
  },

  async listTrending(viewerId?: string): Promise<PublicProduct[]> {
    const rankedIds = await trendingService.getTrendingProductIds(TRENDING_LIMIT);
    const rows =
      rankedIds.length > 0
        ? await productCatalogRepository.listApprovedByIds(rankedIds)
        : await productCatalogRepository.listTrending();
    return hydrateSavedFlags(rows.map(toPublicProduct), viewerId);
  },

  async listSale(viewerId?: string): Promise<PublicProduct[]> {
    const rankedIds = await saleService.getSaleProductIds(viewerId, SALE_RAIL_LIMIT);
    if (rankedIds.length === 0) return [];
    const rows = await productCatalogRepository.listApprovedByIds(rankedIds);
    return hydrateSavedFlags(rows.map(toPublicProduct), viewerId);
  },

  async listNewArrivals(viewerId?: string): Promise<PublicProduct[]> {
    const rows = await productCatalogRepository.listNewArrivals();
    return hydrateSavedFlags(rows.map(toPublicProduct), viewerId);
  },
};
