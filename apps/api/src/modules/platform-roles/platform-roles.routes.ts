import { Router } from "express";

import { crmWriteRateLimit } from "#middlewares/crm-rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
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

platformRolesRoutes.use(requireAuth, requirePlatformAccess);

platformRolesRoutes.get("/permissions", platformRolesController.listPermissions);
platformRolesRoutes.get("/roles", platformRolesController.listRoles);
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

platformRolesRoutes.get("/team", platformRolesController.listTeam);
platformRolesRoutes.patch(
  "/team/:membershipId",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ params: platformTeamMembershipIdParamsSchema, body: updatePlatformTeamMemberSchema }),
  platformRolesController.updateTeamMember,
);
