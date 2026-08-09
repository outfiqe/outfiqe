import { Router } from "express";

import { followController } from "./follow.controller.js";
import { followParamsSchema } from "./follow.schemas.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { validate } from "../../shared/middlewares/validate.js";

export const followRoutes = Router();

// Must come before "/:targetType/:targetId" or Express would match "suggested-creators" as a type.
followRoutes.get("/suggested-creators", requireAuth, followController.suggestedCreators);

followRoutes.post(
  "/:targetType/:targetId",
  requireAuth,
  validate({ params: followParamsSchema }),
  followController.follow,
);
followRoutes.delete(
  "/:targetType/:targetId",
  requireAuth,
  validate({ params: followParamsSchema }),
  followController.unfollow,
);
