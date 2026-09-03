import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";

import { brandOverviewController } from "./brand-overview.controller.js";

export const brandOverviewRoutes = Router();

brandOverviewRoutes.get("/me/overview", requireAuth, brandOverviewController.getMine);
