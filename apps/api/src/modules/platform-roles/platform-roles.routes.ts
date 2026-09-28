import { Router } from "express";

import { crmWriteRateLimit } from "#middlewares/crm-rate-limit.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";
import { requireCoFounder } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { platformRolesController } from "./platform-roles.controller.js";
import {
  createPlatformRoleSchema,
  platformRoleIdParamsSchema,
  platformTeamMembershipIdParamsSchema,
  updatePlatformRoleSchema,
  updatePlatformTeamMemberSchema,
} from "./platform-roles.schemas.js";

export const platformRolesRoutes = Router();

platformRolesRoutes.get(
  "/permissions",
  ...platformGuards.teamManage,
  platformRolesController.listPermissions,
);
platformRolesRoutes.get("/roles", ...platformGuards.teamManage, platformRolesController.listRoles);
platformRolesRoutes.post(
  "/roles",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ body: createPlatformRoleSchema }),
  platformRolesController.createRole,
);
platformRolesRoutes.patch(
  "/roles/:roleId",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ params: platformRoleIdParamsSchema, body: updatePlatformRoleSchema }),
  platformRolesController.updateRole,
);
platformRolesRoutes.delete(
  "/roles/:roleId",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ params: platformRoleIdParamsSchema }),
  platformRolesController.deleteRole,
);

platformRolesRoutes.get("/team", ...platformGuards.teamManage, platformRolesController.listTeam);
platformRolesRoutes.patch(
  "/team/:membershipId",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ params: platformTeamMembershipIdParamsSchema, body: updatePlatformTeamMemberSchema }),
  platformRolesController.updateTeamMember,
);
