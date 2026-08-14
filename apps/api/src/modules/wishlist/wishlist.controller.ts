import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import type { AuthPrincipal } from "#types/token.types.js";

import type { ListWishlistQuery, WishlistProductIdParam } from "./wishlist.schemas.js";
import { wishlistService } from "./wishlist.service.js";

const requirePrincipal = (res: Response): AuthPrincipal => {
  const principal = getAuthPrincipal(res);
  if (!principal) throw new Error("reached without an auth principal");
  return principal;
};

export const wishlistController = {
  async save(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const { productId } = validated.params<WishlistProductIdParam>(res);

    const result = await wishlistService.save(userId, productId);
    sendSuccess(res, result, "Saved.");
  },

  async unsave(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const { productId } = validated.params<WishlistProductIdParam>(res);

    const result = await wishlistService.unsave(userId, productId);
    sendSuccess(res, result, "Removed.");
  },

  async list(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const query = validated.query<ListWishlistQuery>(res);

    const page = await wishlistService.list(userId, query);
    sendSuccess(res, page, "Saved items.");
  },
};
