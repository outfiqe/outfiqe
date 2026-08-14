import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { heroSlideController } from "./heroSlide.controller.js";
import {
  createHeroSlideSchema,
  heroSlideIdParamSchema,
  updateHeroSlideSchema,
} from "./heroSlide.schemas.js";
import { heroSlideService } from "./heroSlide.service.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

const CACHE_NAMESPACE = "hero-slides";

const heroSlidesPublicCache = cache({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.HERO_SLIDES_PUBLIC,
});

const refreshHeroSlidesPublicCache = refreshCacheOnWrite({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.HERO_SLIDES_PUBLIC,
  load: () => heroSlideService.listPublic(),
});

export const heroSlideRoutes = Router();

heroSlideRoutes.get("/admin", ...requireAdmin, heroSlideController.listAll);

heroSlideRoutes.get("/", heroSlidesPublicCache, heroSlideController.listPublic);

heroSlideRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createHeroSlideSchema }),
  refreshHeroSlidesPublicCache,
  heroSlideController.create,
);
heroSlideRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: heroSlideIdParamSchema, body: updateHeroSlideSchema }),
  refreshHeroSlidesPublicCache,
  heroSlideController.update,
);
