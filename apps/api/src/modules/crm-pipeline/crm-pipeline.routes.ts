import { Router } from "express";

import { crmWriteRateLimit } from "#middlewares/crm-rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";
import { requireAdvancedCrmFeatures } from "#modules/crm-billing/crm-billing.middleware.js";
import { requireFeature } from "#modules/platform-features/platform-features.middleware.js";

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

const tenantChain = [
  resolveTenant,
  requireAuth,
  requireAdvancedCrmFeatures,
  requireFeature("crm.pipeline"),
] as const;
const writeChain = [...tenantChain, crmWriteRateLimit] as const;

export const crmPipelineRoutes = Router();

crmPipelineRoutes.get(
  "/pipeline/stages",
  ...tenantChain,
  requirePermission(PIPELINE_READ),
  crmPipelineController.listStages,
);
crmPipelineRoutes.post(
  "/pipeline/stages",
  ...writeChain,
  requirePermission(PIPELINE_CONFIGURE),
  validate({ body: createStageSchema }),
  crmPipelineController.createStage,
);
crmPipelineRoutes.post(
  "/pipeline/stages/reorder",
  ...writeChain,
  requirePermission(PIPELINE_CONFIGURE),
  validate({ body: reorderStagesSchema }),
  crmPipelineController.reorderStages,
);
crmPipelineRoutes.patch(
  "/pipeline/stages/:stageId",
  ...writeChain,
  requirePermission(PIPELINE_CONFIGURE),
  validate({ params: stageIdParamsSchema, body: updateStageSchema }),
  crmPipelineController.updateStage,
);
crmPipelineRoutes.delete(
  "/pipeline/stages/:stageId",
  ...writeChain,
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
  ...writeChain,
  requirePermission(DEALS_WRITE),
  validate({ body: createDealSchema }),
  crmPipelineController.createDeal,
);
crmPipelineRoutes.patch(
  "/deals/:dealId",
  ...writeChain,
  requirePermission(DEALS_WRITE),
  validate({ params: dealIdParamsSchema, body: updateDealSchema }),
  crmPipelineController.updateDeal,
);
crmPipelineRoutes.delete(
  "/deals/:dealId",
  ...writeChain,
  requirePermission(DEALS_DELETE),
  validate({ params: dealIdParamsSchema }),
  crmPipelineController.deleteDeal,
);
