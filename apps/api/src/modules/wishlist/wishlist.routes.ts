import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { wishlistController } from "./wishlist.controller.js";
import { listWishlistQuerySchema, wishlistProductIdParamSchema } from "./wishlist.schemas.js";

export const wishlistRoutes = Router();

wishlistRoutes.get(
  "/",
  requireAuth,
  validate({ query: listWishlistQuerySchema }),
  wishlistController.list,
);
wishlistRoutes.post(
  "/:productId",
  requireAuth,
  validate({ params: wishlistProductIdParamSchema }),
  wishlistController.save,
);
wishlistRoutes.delete(
  "/:productId",
  requireAuth,
  validate({ params: wishlistProductIdParamSchema }),
  wishlistController.unsave,
);
