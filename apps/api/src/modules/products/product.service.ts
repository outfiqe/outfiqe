import { prisma } from "#db/prisma.js";
import { productApprovedTemplate, productRejectedTemplate } from "#email-templates/templates.js";
import { ProductStatus } from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isForeignKeyConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { categoryService } from "#modules/categories/category.service.js";
import { sizeOptionService } from "#modules/size-options/size-option.service.js";
import { wishlistRepository } from "#modules/wishlist/wishlist.repository.js";

import { PRODUCT_TYPE_SLUGS, SLUG_TO_PRODUCT_TYPE } from "./product.constants.js";
import type { DbClient } from "./product.repository.js";
import { productRepository } from "./product.repository.js";
import type {
  AdjustStockBody,
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
  PublicProduct,
  PublicProductDetail,
  PublicProductPage,
  PublicProductType,
} from "./product.types.js";
import { humanizeSlug, toBrandSummary, toPublicProduct } from "./product.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const BAD_REQUEST_STATUS = 400;

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
    const categories = await categoryService.getManyBySlugs(categorySlugs);
    const sizeOptions = await sizeOptionService.getManyByIds(
      sizes.map((size) => size.sizeOptionId),
      type,
    );
    const sizeOptionById = new Map(sizeOptions.map((sizeOption) => [sizeOption.id, sizeOption]));

    const product = await productRepository.create({
      brandId,
      name,
      price,
      type: SLUG_TO_PRODUCT_TYPE[type],
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

    let sizeChanges: CreateProductSizeInput[] | undefined;
    if (type !== undefined && SLUG_TO_PRODUCT_TYPE[type] !== product.type) {
      if (!sizes || sizes.length === 0) {
        throw new AppError(
          "SIZES_REQUIRED",
          "Add at least one size for the new product type.",
          BAD_REQUEST_STATUS,
        );
      }

      const sizeOptions = await sizeOptionService.getManyByIds(
        sizes.map((size) => size.sizeOptionId),
        type,
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
        type: type ? SLUG_TO_PRODUCT_TYPE[type] : undefined,
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

  async listPublic({
    type: typeSlug,
    category,
    q,
    sort,
    cursor,
    limit,
  }: ListPublicProductsQuery): Promise<PublicProductPage> {
    const type = typeSlug ? SLUG_TO_PRODUCT_TYPE[typeSlug] : undefined;
    const categoryId = category ? (await categoryService.getBySlug(category)).id : undefined;

    const [rows, counts] = await Promise.all([
      productRepository.listPublic({ categoryId, type, q, sort, cursor, limit }),
      productRepository.countPublic({ categoryId, type, q, sort }),
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

  async listPublicByBrand(
    brandId: string,
    { type: typeSlug, cursor, limit }: ListBrandProductsQuery,
  ): Promise<PublicProductPage> {
    const type = typeSlug ? SLUG_TO_PRODUCT_TYPE[typeSlug] : undefined;

    const [rows, counts] = await Promise.all([
      productRepository.listPublic({ brandId, type, cursor, limit }),
      productRepository.countPublic({ brandId, type }),
    ]);

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return {
      products: pagedProducts.map(toPublicProduct),
      nextCursor,
      total: counts.total,
      brandCount: counts.brandCount,
    };
  },

  async listTypes(): Promise<PublicProductType[]> {
    return PRODUCT_TYPE_SLUGS.map((slug) => ({ slug, label: humanizeSlug(slug) }));
  },

  async listTrending(): Promise<PublicProduct[]> {
    return (await productRepository.listTrending()).map(toPublicProduct);
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
