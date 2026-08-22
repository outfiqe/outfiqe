import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";

import { achievementController } from "./achievement.controller.js";

export const achievementRoutes = Router();

achievementRoutes.get("/me/progress", requireAuth, achievementController.listMyProgress);
