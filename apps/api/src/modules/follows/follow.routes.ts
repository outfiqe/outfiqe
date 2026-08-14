import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { followController } from "./follow.controller.js";
import { followParamsSchema } from "./follow.schemas.js";

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
