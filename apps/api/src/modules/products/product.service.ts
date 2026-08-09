import { productRepository } from "./product.repository.js";
import { brandRepository } from "../brands/brand.repository.js";

import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";

import { AppError } from "../../shared/middlewares/error-handler.js";
import { ProductStatus } from "../../generated/prisma/enums.js";
import {
  PRODUCT_TYPE_TO_SLUG,
  SLUG_TO_PRODUCT_TYPE,
  SLUG_TO_TASTE_CATEGORY,
  TASTE_CATEGORY_TO_SLUG,
} from "./product.constants.js";
import {
  productApprovedTemplate,
  productRejectedTemplate,
} from "../../shared/email-templates/templates.js";

import type {
  CreateProductBody,
  ListPublicProductsQuery,
  UpdateProductBody,
} from "./product.schemas.js";
import type {
  ProductRecord,
  ProductWithBrand,
  PublicProduct,
  PublicProductPage,
} from "./product.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const NEW_ARRIVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const isNew = (createdAt: Date): boolean =>
  Date.now() - createdAt.getTime() <= NEW_ARRIVAL_WINDOW_MS;

export const toPublicProduct = (product: ProductWithBrand): PublicProduct => ({
  id: product.id,
  brand: product.brand.name,
  name: product.name,
  price: product.price,
  type: PRODUCT_TYPE_TO_SLUG[product.type],
  categorySlug: TASTE_CATEGORY_TO_SLUG[product.category],
  imageUrl: product.imageUrl,
  lowStock: product.lowStock,
  isNew: isNew(product.createdAt),
});

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
  async create(userId: string, input: CreateProductBody): Promise<ProductRecord> {
    const brandId = await requireBrandId(userId);

    return productRepository.create({
      brandId,
      name: input.name,
      price: input.price,
      type: SLUG_TO_PRODUCT_TYPE[input.type],
      category: SLUG_TO_TASTE_CATEGORY[input.category],
      imageUrl: input.imageUrl,
      lowStock: input.lowStock,
    });
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

    return productRepository.update(productId, {
      name: input.name,
      price: input.price,
      type: input.type ? SLUG_TO_PRODUCT_TYPE[input.type] : undefined,
      category: input.category ? SLUG_TO_TASTE_CATEGORY[input.category] : undefined,
      imageUrl: input.imageUrl,
      lowStock: input.lowStock,
    });
  },

  async listMine(userId: string): Promise<ProductRecord[]> {
    const brandId = await requireBrandId(userId);
    return productRepository.listByBrandId(brandId);
  },

  async listForReview(status: ProductStatus = ProductStatus.PENDING): Promise<ProductWithBrand[]> {
    return productRepository.listForReview(status);
  },

  async listPublic(query: ListPublicProductsQuery): Promise<PublicProductPage> {
    const category = query.category ? SLUG_TO_TASTE_CATEGORY[query.category] : undefined;
    const type = query.type ? SLUG_TO_PRODUCT_TYPE[query.type] : undefined;

    const [rows, counts] = await Promise.all([
      productRepository.listPublic({ category, type, cursor: query.cursor, limit: query.limit }),
      productRepository.countPublic({ category, type }),
    ]);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const lastRow = page[page.length - 1];

    return {
      products: page.map(toPublicProduct),
      nextCursor: hasMore && lastRow ? lastRow.id : null,
      total: counts.total,
      brandCount: counts.brandCount,
    };
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
