import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { readRequiredIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validated } from "#middlewares/validate.js";

import { logisticsRiderTaskService } from "./rider-task.service.js";
import type { CollectScanBody, RiderTaskIdParam, WastedVisitBody } from "./rounds.schemas.js";

export const logisticsRiderTaskController = {
  async listOpen(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const tasks = await logisticsRiderTaskService.listOpenRiderTasks(userId);
    sendSuccess(res, { tasks }, "Your visits.");
  },

  async get(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { taskId } = validated.params<RiderTaskIdParam>(res);
    const task = await logisticsRiderTaskService.getRiderTask(userId, taskId);
    sendSuccess(res, task, "Visit.");
  },

  async collect(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { taskId } = validated.params<RiderTaskIdParam>(res);
    const task = await logisticsRiderTaskService.collectBag(
      userId,
      taskId,
      validated.body<CollectScanBody>(res),
      readRequiredIdempotencyKey(req),
    );
    sendSuccess(res, task, "Bag collected.");
  },

  async markWasted(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { taskId } = validated.params<RiderTaskIdParam>(res);
    const task = await logisticsRiderTaskService.markVisitWasted(
      userId,
      taskId,
      validated.body<WastedVisitBody>(res),
    );
    sendSuccess(res, task, "Visit marked as wasted.");
  },

  async finish(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { taskId } = validated.params<RiderTaskIdParam>(res);
    const task = await logisticsRiderTaskService.finishVisit(userId, taskId);
    sendSuccess(res, task, "Visit finished.");
  },
};
