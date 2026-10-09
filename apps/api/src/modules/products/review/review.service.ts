import { HTTP_STATUS } from "#constants/http.constants.js";
import { productApprovedTemplate, productRejectedTemplate } from "#email-templates/templates.js";
import { ProductStatus } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";

import { productRepository } from "../product.repository.js";
import type { ListReviewProductsQuery } from "../product.schemas.js";
import type { ProductRecord, ProductReviewPage } from "../product.types.js";

const requirePendingProduct = async (productId: string): Promise<ProductRecord> => {
  const product = await productRepository.findById(productId);
  if (!product || product.deletedAt) {
    throw new AppError("NOT_FOUND", "Product not found.", HTTP_STATUS.NOT_FOUND);
  }
  if (product.status !== ProductStatus.PENDING) {
    throw new AppError(
      "ALREADY_REVIEWED",
      "This product has already been reviewed.",
      HTTP_STATUS.CONFLICT,
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

export const productReviewService = {
  async listForReview({
    status: rawStatus,
    isThrift,
    cursor,
    limit,
  }: ListReviewProductsQuery): Promise<ProductReviewPage> {
    const status = rawStatus ?? ProductStatus.PENDING;
    const rows = await productRepository.listForReview(status, { cursor, limit, isThrift });

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return {
      products: pagedProducts.map(({ categories, ...rest }) => ({
        ...rest,
        categories: categories.map((category) => category.name),
      })),
      nextCursor,
    };
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
