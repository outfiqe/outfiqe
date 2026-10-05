import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { OutboxEventIdParam, QueueNameParam } from "./platform-jobs.schemas.js";
import { platformJobsService } from "./platform-jobs.service.js";

export const platformJobsController = {
  async getHealth(_req: Request, res: Response) {
    sendSuccess(res, await platformJobsService.getHealth(), "Jobs and health.");
  },

  async retryOutboxEvent(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { eventId } = validated.params<OutboxEventIdParam>(res);
    await platformJobsService.retryOutboxEvent(userId, eventId);
    sendSuccess(res, null, "The event will be sent again.");
  },

  async retryFailedJobs(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { queueName } = validated.params<QueueNameParam>(res);
    const result = await platformJobsService.retryFailedJobs(userId, queueName);
    sendSuccess(res, result, "Failed jobs sent again.");
  },
};
