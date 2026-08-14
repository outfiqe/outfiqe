import { productApprovedTemplate, productRejectedTemplate } from "#email-templates/templates.js";
import { ProductStatus } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { categoryService } from "#modules/categories/category.service.js";
import { wishlistRepository } from "#modules/wishlist/wishlist.repository.js";

import { PRODUCT_TYPE_SLUGS, SLUG_TO_PRODUCT_TYPE } from "./product.constants.js";
import { productRepository } from "./product.repository.js";
import type {
  CreateProductBody,
  ListBrandProductsQuery,
  ListMineProductsQuery,
  ListPublicProductsQuery,
  ListReviewProductsQuery,
  UpdateProductBody,
} from "./product.schemas.js";
import type {
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

const requireBrandId = async (userId: string): Promise<string> => {
  const profile = await brandRepository.findByMemberUserId(userId);
  if (!profile) {
    throw new AppError("BRAND_NOT_FOUND", "No brand is linked to this account.", NOT_FOUND_STATUS);
  }
  return profile.brand.id;
};

const requireOwnedProduct = async (productId: string, brandId: string): Promise<ProductRecord> => {
  const product = await productRepository.findById(productId);
  if (!product || product.brandId !== brandId) {
    throw new AppError("NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);
  }
  return product;
};

const requirePendingProduct = async (productId: string): Promise<ProductRecord> => {
  const product = await productRepository.findById(productId);
  if (!product) throw new AppError("NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);
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
  async create(userId: string, input: CreateProductBody): Promise<ProductBrandSummary> {
    const brandId = await requireBrandId(userId);
    const categories = await categoryService.getManyBySlugs(input.categories);

    const product = await productRepository.create({
      brandId,
      name: input.name,
      price: input.price,
      type: SLUG_TO_PRODUCT_TYPE[input.type],
      categoryIds: categories.map((category) => category.id),
      imageUrls: input.imageUrls,
      lowStock: input.lowStock,
    });

    return toBrandSummary(product);
  },

  async update(
    userId: string,
    productId: string,
    input: UpdateProductBody,
  ): Promise<ProductRecord> {
    const brandId = await requireBrandId(userId);
    const product = await requireOwnedProduct(productId, brandId);

    if (product.status === ProductStatus.APPROVED) {
      throw new AppError(
        "ALREADY_APPROVED",
        "This product is already live and can't be edited. Contact support to make changes.",
        CONFLICT_STATUS,
      );
    }

    const categoryIds = input.categories
      ? (await categoryService.getManyBySlugs(input.categories)).map((category) => category.id)
      : undefined;

    return productRepository.update(productId, {
      name: input.name,
      price: input.price,
      type: input.type ? SLUG_TO_PRODUCT_TYPE[input.type] : undefined,
      categoryIds,
      imageUrls: input.imageUrls,
      lowStock: input.lowStock,
    });
  },

  async listMine(userId: string, query: ListMineProductsQuery): Promise<ProductBrandSummaryPage> {
    const brandId = await requireBrandId(userId);
    const rows = await productRepository.listByBrandId(brandId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);
    return { products: items.map(toBrandSummary), nextCursor };
  },

  async listForReview(query: ListReviewProductsQuery): Promise<ProductReviewPage> {
    const status = query.status ?? ProductStatus.PENDING;
    const rows = await productRepository.listForReview(status, {
      cursor: query.cursor,
      limit: query.limit,
    });

    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);
    return {
      products: items.map(({ categories, ...rest }) => ({
        ...rest,
        categories: categories.map((category) => category.name),
      })),
      nextCursor,
    };
  },

  async listPublic(query: ListPublicProductsQuery): Promise<PublicProductPage> {
    const type = query.type ? SLUG_TO_PRODUCT_TYPE[query.type] : undefined;
    const categoryId = query.category
      ? (await categoryService.getBySlug(query.category)).id
      : undefined;

    const [rows, counts] = await Promise.all([
      productRepository.listPublic({
        categoryId,
        type,
        q: query.q,
        cursor: query.cursor,
        limit: query.limit,
      }),
      productRepository.countPublic({ categoryId, type, q: query.q }),
    ]);

    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return {
      products: items.map(toPublicProduct),
      nextCursor,
      total: counts.total,
      brandCount: counts.brandCount,
    };
  },

  async getPublicDetail(id: string, viewerId?: string): Promise<PublicProductDetail> {
    const product = await productRepository.findPublicById(id);
    if (!product) throw new AppError("NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);

    const [seenOnCreators, isSaved] = await Promise.all([
      productRepository.listSeenOnCreators(id),
      viewerId ? wishlistRepository.isSaved(viewerId, id) : false,
    ]);

    return {
      ...toPublicProduct(product),
      brand: { id: product.brandId, name: product.brand.name },
      sizes: product.sizes,
      images: product.images.map((image) => image.url),
      wornByCount: product.wornByCount,
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
    query: ListBrandProductsQuery,
  ): Promise<PublicProductPage> {
    const type = query.type ? SLUG_TO_PRODUCT_TYPE[query.type] : undefined;

    const [rows, counts] = await Promise.all([
      productRepository.listPublic({ brandId, type, cursor: query.cursor, limit: query.limit }),
      productRepository.countPublic({ brandId, type }),
    ]);

    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return {
      products: items.map(toPublicProduct),
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
