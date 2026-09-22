import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { followController } from "./follow.controller.js";
import {
  followingUserIdParamSchema,
  followParamsSchema,
  listFollowersQuerySchema,
  listSuggestedCreatorsQuerySchema,
} from "./follow.schemas.js";

export const followRoutes = Router();

const requireNonAdminViewer = [requireAuth, requireRole(UserRole.CUSTOMER, UserRole.BRAND_OWNER)];

followRoutes.get(
  "/suggested-creators",
  requireNonAdminViewer,
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
