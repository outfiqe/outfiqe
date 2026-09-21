import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { creatorLinkController } from "./creatorLink.controller.js";
import {
  createExternalLinkSchema,
  createInternalLinkSchema,
  linkIdParamSchema,
  linkTokenParamSchema,
  listMyLinksQuerySchema,
  recordLinkClickSchema,
} from "./creatorLink.schemas.js";

export const creatorLinkRoutes = Router();

creatorLinkRoutes.get(
  "/mine",
  requireAuth,
  validate({ query: listMyLinksQuerySchema }),
  creatorLinkController.listMine,
);

creatorLinkRoutes.post(
  "/internal",
  requireAuth,
  validate({ body: createInternalLinkSchema }),
  creatorLinkController.createInternal,
);

creatorLinkRoutes.post(
  "/external",
  requireAuth,
  validate({ body: createExternalLinkSchema }),
  creatorLinkController.getOrCreateExternal,
);

creatorLinkRoutes.delete(
  "/:id",
  requireAuth,
  validate({ params: linkIdParamSchema }),
  creatorLinkController.remove,
);

creatorLinkRoutes.post(
  "/:token/click",
  optionalAuth,
  validate({ params: linkTokenParamSchema, body: recordLinkClickSchema }),
  creatorLinkController.recordClick,
);
