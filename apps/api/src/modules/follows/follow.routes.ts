import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { followController } from "./follow.controller.js";
import {
  followingUserIdParamSchema,
  followParamsSchema,
  listFollowersQuerySchema,
  listSuggestedCreatorsQuerySchema,
} from "./follow.schemas.js";

export const followRoutes = Router();

followRoutes.get(
  "/suggested-creators",
  requireAuth,
  validate({ query: listSuggestedCreatorsQuerySchema }),
  followController.suggestedCreators,
);

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
