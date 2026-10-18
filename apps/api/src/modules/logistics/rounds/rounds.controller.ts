import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AssignRiderTaskBody,
  ListRiderTasksQuery,
  PickupBoardQuery,
  RiderTaskIdParam,
} from "./rounds.schemas.js";
import { logisticsRoundService } from "./rounds.service.js";

export const logisticsRoundController = {
  async listPickupBoard(_req: Request, res: Response) {
    const page = await logisticsRoundService.listPickupBoard(
      validated.query<PickupBoardQuery>(res),
    );
    sendSuccess(res, page, "Pickups waiting for a rider.");
  },

  async assignTask(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const task = await logisticsRoundService.assignRiderTask(
      validated.body<AssignRiderTaskBody>(res),
      userId,
    );
    sendSuccess(res, task, "Visit assigned.", HTTP_STATUS.CREATED);
  },

  async listTasks(_req: Request, res: Response) {
    const page = await logisticsRoundService.listRiderTasks(
      validated.query<ListRiderTasksQuery>(res),
    );
    sendSuccess(res, page, "Rider visits.");
  },

  async cancelTask(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { taskId } = validated.params<RiderTaskIdParam>(res);
    const task = await logisticsRoundService.cancelRiderTask(taskId, userId);
    sendSuccess(res, task, "Visit cancelled.");
  },
};
