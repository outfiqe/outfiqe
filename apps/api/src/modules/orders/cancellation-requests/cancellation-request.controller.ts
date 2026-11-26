import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CancellationRequestGroupParam,
  ListCancellationRequestsQuery,
  RejectCancellationRequestBody,
} from "./cancellation-request.schemas.js";
import { orderCancellationRequestService } from "./cancellation-request.service.js";

export const orderCancellationRequestController = {
  async listForStaff(_req: Request, res: Response) {
    const page = await orderCancellationRequestService.listPending(
      validated.query<ListCancellationRequestsQuery>(res),
    );
    sendSuccess(res, page, "Brand cancellation requests.");
  },

  async approve(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { groupId } = validated.params<CancellationRequestGroupParam>(res);
    const decision = await orderCancellationRequestService.approve(userId, groupId);
    sendSuccess(res, decision, "Approved and refunded.");
  },

  async reject(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { groupId } = validated.params<CancellationRequestGroupParam>(res);
    const decision = await orderCancellationRequestService.reject(
      userId,
      groupId,
      validated.body<RejectCancellationRequestBody>(res),
    );
    sendSuccess(res, decision, "Request declined.");
  },
};
