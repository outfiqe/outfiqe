import { Router } from "express";

import { creatorLookController } from "./creatorLook.controller.js";
import {
  commentsQuerySchema,
  createCommentSchema,
  createCreatorLookSchema,
  feedQuerySchema,
  listCreatorLooksQuerySchema,
  lookIdParamsSchema,
  tagClickParamsSchema,
  tagClickSchema,
} from "./creatorLook.schemas.js";

import { optionalAuth } from "../../shared/middlewares/optional-auth.js";
import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { validate } from "../../shared/middlewares/validate.js";

export const creatorLookRoutes = Router();

// Static/prefixed paths first — Express would otherwise never reach them once a
// "/:lookId"-shaped route below matched the same segment.
creatorLookRoutes.get(
  "/feed",
  optionalAuth,
  validate({ query: feedQuerySchema }),
  creatorLookController.feed,
);
creatorLookRoutes.get("/tags/trending", creatorLookController.trendingTags);
creatorLookRoutes.get("/mine", requireAuth, creatorLookController.listMine);

creatorLookRoutes.get(
  "/",
  validate({ query: listCreatorLooksQuerySchema }),
  creatorLookController.listFeatured,
);
creatorLookRoutes.post(
  "/",
  requireAuth,
  validate({ body: createCreatorLookSchema }),
  creatorLookController.create,
);

creatorLookRoutes.post(
  "/:lookId/like",
  requireAuth,
  validate({ params: lookIdParamsSchema }),
  creatorLookController.like,
);
creatorLookRoutes.delete(
  "/:lookId/like",
  requireAuth,
  validate({ params: lookIdParamsSchema }),
  creatorLookController.unlike,
);
creatorLookRoutes.post(
  "/:lookId/save",
  requireAuth,
  validate({ params: lookIdParamsSchema }),
  creatorLookController.save,
);
creatorLookRoutes.delete(
  "/:lookId/save",
  requireAuth,
  validate({ params: lookIdParamsSchema }),
  creatorLookController.unsave,
);

creatorLookRoutes.get(
  "/:lookId/comments",
  validate({ params: lookIdParamsSchema, query: commentsQuerySchema }),
  creatorLookController.listComments,
);
creatorLookRoutes.post(
  "/:lookId/comments",
  requireAuth,
  validate({ params: lookIdParamsSchema, body: createCommentSchema }),
  creatorLookController.addComment,
);

creatorLookRoutes.post(
  "/:lookId/tags/:productId/click",
  optionalAuth,
  validate({ params: tagClickParamsSchema, body: tagClickSchema }),
  creatorLookController.recordTagClick,
);
