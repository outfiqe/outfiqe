import { productErrors } from "./product.errors.js";
import { productRepository } from "./product.repository.js";
import type { ProductRecord } from "./product.types.js";

export const requireOwnedProduct = async (
  productId: string,
  brandId: string,
): Promise<ProductRecord> => {
  const product = await productRepository.findById(productId);
  if (!product || product.brandId !== brandId || product.deletedAt) {
    throw productErrors.notFound();
  }
  return product;
};
