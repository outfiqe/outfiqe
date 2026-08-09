import { Router } from "express";

import { creatorLookController } from "./creatorLook.controller.js";
import { createCreatorLookSchema, listCreatorLooksQuerySchema } from "./creatorLook.schemas.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { validate } from "../../shared/middlewares/validate.js";

export const creatorLookRoutes = Router();

creatorLookRoutes.get(
  "/",
  validate({ query: listCreatorLooksQuerySchema }),
  creatorLookController.listFeatured,
);
creatorLookRoutes.get("/mine", requireAuth, creatorLookController.listMine);
creatorLookRoutes.post(
  "/",
  requireAuth,
  validate({ body: createCreatorLookSchema }),
  creatorLookController.create,
);
