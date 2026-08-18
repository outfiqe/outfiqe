import { Router } from "express";

import { validate } from "#middlewares/validate.js";

import { leaderboardController } from "./leaderboard.controller.js";
import { listLeaderboardQuerySchema } from "./leaderboard.schemas.js";

export const leaderboardRoutes = Router();

leaderboardRoutes.get(
  "/brands",
  validate({ query: listLeaderboardQuerySchema }),
  leaderboardController.listBrands,
);
