import { Router } from "express";

import { brandApplicationController } from "./brandApplication.controller.js";
import { createBrandApplicationSchema } from "./brandApplication.schemas.js";

import { rateLimit } from "../../shared/middlewares/rate-limit.js";
import { validate, validated } from "../../shared/middlewares/validate.js";

import type { CreateBrandApplicationBody } from "./brandApplication.schemas.js";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS = 3;

const brandApplicationRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<CreateBrandApplicationBody>(res).phone,
  message: "Too many applications from this number. Please try again tomorrow.",
});

export const brandApplicationRoutes = Router();

brandApplicationRoutes.post(
  "/",
  validate({ body: createBrandApplicationSchema }),
  brandApplicationRateLimit,
  brandApplicationController.create,
);
