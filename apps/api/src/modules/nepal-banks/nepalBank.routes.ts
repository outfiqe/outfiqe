import { Router } from "express";

import { cache } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { nepalBankController } from "./nepalBank.controller.js";

const nepalBanksPublicCache = cache({
  namespace: "nepal-banks",
  ttlSeconds: CACHE_TTL.NEPAL_BANKS_PUBLIC,
  successMessage: "Banks.",
});

export const nepalBankRoutes = Router();

nepalBankRoutes.get("/", requireAuth, nepalBanksPublicCache, nepalBankController.listActive);
