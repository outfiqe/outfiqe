import { wishlistRepository } from "./wishlist.repository.js";
import { productRepository } from "../products/product.repository.js";
import { toPublicProduct } from "../products/product.service.js";

import { AppError } from "../../shared/middlewares/error-handler.js";

import type { ListWishlistQuery } from "./wishlist.schemas.js";
import type { WishlistResult } from "./wishlist.types.js";
import type { PublicProductPage } from "../products/product.types.js";

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
    const [{ products, hasMore }, total] = await Promise.all([
      wishlistRepository.listSaved(userId, query),
      wishlistRepository.count(userId),
    ]);
    const publicProducts = products.map(toPublicProduct);
    const last = publicProducts[publicProducts.length - 1];

    return {
      products: publicProducts,
      nextCursor: hasMore && last ? last.id : null,
      total,
      brandCount: 0,
    };
  },
};
