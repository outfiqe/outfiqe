import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

import { productRepository } from "./product.repository.js";
import type { ProductRecord } from "./product.types.js";

export const requireOwnedProduct = async (
  productId: string,
  brandId: string,
): Promise<ProductRecord> => {
  const product = await productRepository.findById(productId);
  if (!product || product.brandId !== brandId || product.deletedAt) {
    throw new AppError("NOT_FOUND", "Product not found.", HTTP_STATUS.NOT_FOUND);
  }
  return product;
};
