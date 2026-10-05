import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { platformSettingsController } from "./platform-settings.controller.js";
import { settingKeyParamsSchema, updateSettingBodySchema } from "./platform-settings.schemas.js";

export const platformSettingsRoutes = Router();

const settingsChain = [
  ...requirePlatformRole("platform:settings:manage"),
  requirePlatformNavItem("platform-settings"),
];

platformSettingsRoutes.get("/settings", ...settingsChain, platformSettingsController.list);

platformSettingsRoutes.put(
  "/settings/:key",
  ...settingsChain,
  validate({ params: settingKeyParamsSchema, body: updateSettingBodySchema }),
  platformSettingsController.update,
);

platformSettingsRoutes.delete(
  "/settings/:key",
  ...settingsChain,
  validate({ params: settingKeyParamsSchema }),
  platformSettingsController.reset,
);
