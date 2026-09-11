import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";

import { platformSuspensionsController } from "./platform-suspensions.controller.js";
import {
  banUserBodySchema,
  suspendUserBodySchema,
  targetBrandIdParamSchema,
  targetUserIdParamSchema,
} from "./platform-suspensions.schemas.js";

export const platformSuspensionsRoutes = Router();

const manageSuspensions = requirePlatformRole("platform:suspensions:manage");

platformSuspensionsRoutes.post(
  "/users/:userId/suspend",
  ...manageSuspensions,
  validate({ params: targetUserIdParamSchema, body: suspendUserBodySchema }),
  platformSuspensionsController.suspendUser,
);

platformSuspensionsRoutes.post(
  "/users/:userId/ban",
  ...manageSuspensions,
  validate({ params: targetUserIdParamSchema, body: banUserBodySchema }),
  platformSuspensionsController.banUser,
);

platformSuspensionsRoutes.post(
  "/users/:userId/unsuspend",
  ...manageSuspensions,
  validate({ params: targetUserIdParamSchema }),
  platformSuspensionsController.unsuspendUser,
);

platformSuspensionsRoutes.post(
  "/users/:userId/unban",
  ...manageSuspensions,
  validate({ params: targetUserIdParamSchema }),
  platformSuspensionsController.unbanUser,
);

platformSuspensionsRoutes.post(
  "/brands/:brandId/suspend",
  ...manageSuspensions,
  validate({ params: targetBrandIdParamSchema, body: suspendUserBodySchema }),
  platformSuspensionsController.suspendBrand,
);

platformSuspensionsRoutes.post(
  "/brands/:brandId/unsuspend",
  ...manageSuspensions,
  validate({ params: targetBrandIdParamSchema }),
  platformSuspensionsController.unsuspendBrand,
);
