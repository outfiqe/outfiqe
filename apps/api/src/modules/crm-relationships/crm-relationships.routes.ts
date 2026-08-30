import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";
import { requireAdvancedCrmFeatures } from "#modules/crm-billing/crm-billing.middleware.js";

import { crmRelationshipsController } from "./crm-relationships.controller.js";
import {
  creatorIdParamsSchema,
  customerUserIdParamsSchema,
  relationshipListQuerySchema,
} from "./crm-relationships.schemas.js";

const ACCOUNTS_READ_PERMISSION = "accounts:read";
const CUSTOMERS_READ_PERMISSION = "customers:read";

const tenantChain = [resolveTenant, requireAuth, requireAdvancedCrmFeatures] as const;

export const crmRelationshipsRoutes = Router();

crmRelationshipsRoutes.get(
  "/partners",
  ...tenantChain,
  requirePermission(ACCOUNTS_READ_PERMISSION),
  validate({ query: relationshipListQuerySchema }),
  crmRelationshipsController.listPartners,
);
crmRelationshipsRoutes.get(
  "/partners/:creatorId",
  ...tenantChain,
  requirePermission(ACCOUNTS_READ_PERMISSION),
  validate({ params: creatorIdParamsSchema }),
  crmRelationshipsController.getPartner,
);

crmRelationshipsRoutes.get(
  "/customers",
  ...tenantChain,
  requirePermission(CUSTOMERS_READ_PERMISSION),
  validate({ query: relationshipListQuerySchema }),
  crmRelationshipsController.listCustomers,
);
crmRelationshipsRoutes.get(
  "/customers/:userId",
  ...tenantChain,
  requirePermission(CUSTOMERS_READ_PERMISSION),
  validate({ params: customerUserIdParamsSchema }),
  crmRelationshipsController.getCustomer,
);
