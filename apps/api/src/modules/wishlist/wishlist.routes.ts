import { Router } from "express";

import { wishlistController } from "./wishlist.controller.js";
import { listWishlistQuerySchema, wishlistProductIdParamSchema } from "./wishlist.schemas.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { validate } from "../../shared/middlewares/validate.js";

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
