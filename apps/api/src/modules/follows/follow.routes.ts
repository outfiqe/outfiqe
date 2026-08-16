import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { followController } from "./follow.controller.js";
import {
  followingUserIdParamSchema,
  followParamsSchema,
  listFollowersQuerySchema,
} from "./follow.schemas.js";

export const followRoutes = Router();

// Must come before "/:targetType/:targetId" or Express would match "suggested-creators" as a type.
followRoutes.get("/suggested-creators", requireAuth, followController.suggestedCreators);

followRoutes.get(
  "/:targetType/:targetId/followers",
  optionalAuth,
  validate({ params: followParamsSchema, query: listFollowersQuerySchema }),
  followController.listFollowers,
);

followRoutes.get(
  "/user/:userId/following",
  validate({ params: followingUserIdParamSchema, query: listFollowersQuerySchema }),
  followController.listFollowing,
);

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
