import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productRepository } from "#modules/products/product.repository.js";
import { toPublicProduct } from "#modules/products/product.service.js";
import type { PublicProductPage } from "#modules/products/product.types.js";

import { wishlistRepository } from "./wishlist.repository.js";
import type { ListWishlistQuery } from "./wishlist.schemas.js";
import type { WishlistResult } from "./wishlist.types.js";

const NOT_FOUND_STATUS = 404;

const requireProduct = async (productId: string): Promise<void> => {
  const product = await productRepository.findById(productId);
  if (!product) throw new AppError("NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);
};

export const wishlistService = {
  async save(userId: string, productId: string): Promise<WishlistResult> {
    await requireProduct(productId);
    await wishlistRepository.save(userId, productId);
    return { saved: true };
  },

  async unsave(userId: string, productId: string): Promise<WishlistResult> {
    await requireProduct(productId);
    await wishlistRepository.unsave(userId, productId);
    return { saved: false };
  },

  async list(userId: string, query: ListWishlistQuery): Promise<PublicProductPage> {
    const [rows, total] = await Promise.all([
      wishlistRepository.listSaved(userId, query),
      wishlistRepository.count(userId),
    ]);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.productId);

    return {
      products: items.map((row) => toPublicProduct(row.product)),
      nextCursor,
      total,
      brandCount: 0,
    };
  },
};
