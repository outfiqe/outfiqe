import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";
import { requireAdvancedCrmFeatures } from "#modules/crm-billing/crm-billing.middleware.js";

import { crmPipelineController } from "./crm-pipeline.controller.js";
import {
  createDealSchema,
  createStageSchema,
  dealIdParamsSchema,
  reorderStagesSchema,
  stageIdParamsSchema,
  updateDealSchema,
  updateStageSchema,
} from "./crm-pipeline.schemas.js";

const PIPELINE_READ = "pipeline:read";
const PIPELINE_CONFIGURE = "pipeline:configure";
const DEALS_READ = "deals:read";
const DEALS_WRITE = "deals:write";
const DEALS_DELETE = "deals:delete";

const tenantChain = [resolveTenant, requireAuth, requireAdvancedCrmFeatures] as const;

export const crmPipelineRoutes = Router();

crmPipelineRoutes.get(
  "/pipeline/stages",
  ...tenantChain,
  requirePermission(PIPELINE_READ),
  crmPipelineController.listStages,
);
crmPipelineRoutes.post(
  "/pipeline/stages",
  ...tenantChain,
  requirePermission(PIPELINE_CONFIGURE),
  validate({ body: createStageSchema }),
  crmPipelineController.createStage,
);
crmPipelineRoutes.post(
  "/pipeline/stages/reorder",
  ...tenantChain,
  requirePermission(PIPELINE_CONFIGURE),
  validate({ body: reorderStagesSchema }),
  crmPipelineController.reorderStages,
);
crmPipelineRoutes.patch(
  "/pipeline/stages/:stageId",
  ...tenantChain,
  requirePermission(PIPELINE_CONFIGURE),
  validate({ params: stageIdParamsSchema, body: updateStageSchema }),
  crmPipelineController.updateStage,
);
crmPipelineRoutes.delete(
  "/pipeline/stages/:stageId",
  ...tenantChain,
  requirePermission(PIPELINE_CONFIGURE),
  validate({ params: stageIdParamsSchema }),
  crmPipelineController.deleteStage,
);

crmPipelineRoutes.get(
  "/deals",
  ...tenantChain,
  requirePermission(DEALS_READ),
  crmPipelineController.listDeals,
);
crmPipelineRoutes.post(
  "/deals",
  ...tenantChain,
  requirePermission(DEALS_WRITE),
  validate({ body: createDealSchema }),
  crmPipelineController.createDeal,
);
crmPipelineRoutes.patch(
  "/deals/:dealId",
  ...tenantChain,
  requirePermission(DEALS_WRITE),
  validate({ params: dealIdParamsSchema, body: updateDealSchema }),
  crmPipelineController.updateDeal,
);
crmPipelineRoutes.delete(
  "/deals/:dealId",
  ...tenantChain,
  requirePermission(DEALS_DELETE),
  validate({ params: dealIdParamsSchema }),
  crmPipelineController.deleteDeal,
);
