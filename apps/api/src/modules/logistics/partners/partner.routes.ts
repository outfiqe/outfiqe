import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsPartnerController } from "./partner.controller.js";
import {
  createPartnerStatusImportSchema,
  partnerAccountBodySchema,
  partnerAccountParamSchema,
  partnerBodySchema,
  partnerIdParamSchema,
  partnerStatusImportParamSchema,
  replacePartnerZonesSchema,
  savePartnerStatusMapSchema,
} from "./partner.schemas.js";

export const logisticsPartnerRoutes = Router();

logisticsPartnerRoutes.get("/", ...platformGuards.logisticsRead, logisticsPartnerController.list);

logisticsPartnerRoutes.post(
  "/",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ body: partnerBodySchema }),
  logisticsPartnerController.create,
);

logisticsPartnerRoutes.get(
  "/:partnerId",
  ...platformGuards.logisticsRead,
  validate({ params: partnerIdParamSchema }),
  logisticsPartnerController.get,
);

logisticsPartnerRoutes.put(
  "/:partnerId",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: partnerIdParamSchema, body: partnerBodySchema }),
  logisticsPartnerController.update,
);

logisticsPartnerRoutes.put(
  "/:partnerId/accounts/:hubId",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: partnerAccountParamSchema, body: partnerAccountBodySchema }),
  logisticsPartnerController.saveAccount,
);

logisticsPartnerRoutes.put(
  "/:partnerId/zones",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: partnerIdParamSchema, body: replacePartnerZonesSchema }),
  logisticsPartnerController.replaceZones,
);

logisticsPartnerRoutes.put(
  "/:partnerId/status-map",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: partnerIdParamSchema, body: savePartnerStatusMapSchema }),
  logisticsPartnerController.saveStatusMap,
);

logisticsPartnerRoutes.post(
  "/:partnerId/status-imports",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: partnerIdParamSchema, body: createPartnerStatusImportSchema }),
  logisticsPartnerController.createStatusImport,
);

logisticsPartnerRoutes.get(
  "/:partnerId/status-imports/:importId",
  ...platformGuards.logisticsRead,
  validate({ params: partnerStatusImportParamSchema }),
  logisticsPartnerController.getStatusImport,
);
