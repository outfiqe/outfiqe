import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  VIEW_RATE_LIMIT_MAX_REQUESTS,
  VIEW_RATE_LIMIT_WINDOW_MS,
} from "./creatorLook.constants.js";
import { creatorLookController } from "./creatorLook.controller.js";
import {
  autocompleteQuerySchema,
  commentsQuerySchema,
  createCommentSchema,
  createCreatorLookSchema,
  feedQuerySchema,
  listCreatorLooksQuerySchema,
  listSavedQuerySchema,
  lookIdParamsSchema,
  recordViewSchema,
  searchCreatorLooksQuerySchema,
  tagClickParamsSchema,
  tagClickSchema,
} from "./creatorLook.schemas.js";

const recordViewRateLimit = rateLimit({
  namespace: "creator-look-view",
  windowMs: VIEW_RATE_LIMIT_WINDOW_MS,
  max: VIEW_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
});

export const creatorLookRoutes = Router();

/*  
  Static/prefixed paths first — Express would otherwise never reach them once a
  "/:lookId"-shaped route below matched the same segment.
 */
creatorLookRoutes.get(
  "/feed",
  optionalAuth,
  validate({ query: feedQuerySchema }),
  creatorLookController.feed,
);
creatorLookRoutes.get("/tags/trending", creatorLookController.trendingTags);
creatorLookRoutes.get(
  "/autocomplete",
  validate({ query: autocompleteQuerySchema }),
  creatorLookController.autocomplete,
);
creatorLookRoutes.get(
  "/search",
  optionalAuth,
  validate({ query: searchCreatorLooksQuerySchema }),
  creatorLookController.search,
);
creatorLookRoutes.get(
  "/saved",
  requireAuth,
  validate({ query: listSavedQuerySchema }),
  creatorLookController.listSaved,
);

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

creatorLookRoutes.get(
  "/:lookId",
  requireAuth,
  validate({ params: lookIdParamsSchema }),
  creatorLookController.getOwn,
);
creatorLookRoutes.patch(
  "/:lookId",
  requireAuth,
  validate({ params: lookIdParamsSchema, body: createCreatorLookSchema }),
  creatorLookController.update,
);
creatorLookRoutes.delete(
  "/:lookId",
  requireAuth,
  validate({ params: lookIdParamsSchema }),
  creatorLookController.remove,
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

creatorLookRoutes.post(
  "/:lookId/views",
  optionalAuth,
  validate({ params: lookIdParamsSchema, body: recordViewSchema }),
  recordViewRateLimit,
  creatorLookController.recordView,
);
