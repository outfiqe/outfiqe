import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsBagTagController } from "./bag-tag.controller.js";
import {
  bagTagBatchIdParamSchema,
  createBagTagBatchSchema,
  listBagTagBatchesQuerySchema,
} from "./bag-tag.schemas.js";

export const logisticsBagTagRoutes = Router();

logisticsBagTagRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ query: listBagTagBatchesQuerySchema }),
  logisticsBagTagController.list,
);

logisticsBagTagRoutes.post(
  "/",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ body: createBagTagBatchSchema }),
  logisticsBagTagController.create,
);

logisticsBagTagRoutes.get(
  "/:batchId",
  ...platformGuards.logisticsRead,
  validate({ params: bagTagBatchIdParamSchema }),
  logisticsBagTagController.getSheet,
);
