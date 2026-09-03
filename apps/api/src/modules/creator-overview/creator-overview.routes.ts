import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";

import { creatorOverviewController } from "./creator-overview.controller.js";

export const creatorOverviewRoutes = Router();

creatorOverviewRoutes.get("/me/overview", requireAuth, creatorOverviewController.getMine);
