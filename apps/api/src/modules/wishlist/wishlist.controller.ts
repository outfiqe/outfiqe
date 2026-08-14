import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { ListWishlistQuery, WishlistProductIdParam } from "./wishlist.schemas.js";
import { wishlistService } from "./wishlist.service.js";

export const wishlistController = {
  async save(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId } = validated.params<WishlistProductIdParam>(res);

    const saveResult = await wishlistService.save(userId, productId);
    sendSuccess(res, saveResult, "Saved.");
  },

  async unsave(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId } = validated.params<WishlistProductIdParam>(res);

    const unsaveResult = await wishlistService.unsave(userId, productId);
    sendSuccess(res, unsaveResult, "Removed.");
  },

  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListWishlistQuery>(res);

    const page = await wishlistService.list(userId, query);
    sendSuccess(res, page, "Saved items.");
  },
};
