import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsCodController } from "./cod.controller.js";
import {
  codRemittanceParamSchema,
  listCodRemittancesQuerySchema,
  listUnremittedParcelsQuerySchema,
  recordCodRemittanceSchema,
} from "./cod.schemas.js";

export const logisticsCodRoutes = Router();

logisticsCodRoutes.get(
  "/summary",
  ...platformGuards.logisticsRead,
  logisticsCodController.summarizeUnremittedCash,
);

logisticsCodRoutes.get(
  "/parcels",
  ...platformGuards.logisticsRead,
  validate({ query: listUnremittedParcelsQuerySchema }),
  logisticsCodController.listUnremittedParcels,
);

logisticsCodRoutes.get(
  "/remittances",
  ...platformGuards.logisticsRead,
  validate({ query: listCodRemittancesQuerySchema }),
  logisticsCodController.listRemittances,
);

logisticsCodRoutes.post(
  "/remittances",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ body: recordCodRemittanceSchema }),
  logisticsCodController.recordRemittance,
);

logisticsCodRoutes.get(
  "/remittances/:remittanceId",
  ...platformGuards.logisticsRead,
  validate({ params: codRemittanceParamSchema }),
  logisticsCodController.getRemittance,
);
