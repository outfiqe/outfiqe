import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { FulfilmentGroupIdParam } from "../order.schemas.js";
import type {
  ListUnavailableItemsQuery,
  RejectUnavailableItemBody,
  ReportUnavailableItemsBody,
  UnavailableRequestIdParam,
} from "./unavailable-item.schemas.js";
import { orderUnavailableItemService } from "./unavailable-item.service.js";

export const orderUnavailableItemController = {
  async report(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { groupId } = validated.params<FulfilmentGroupIdParam>(res);
    const requests = await orderUnavailableItemService.reportUnavailableItems(
      userId,
      groupId,
      validated.body<ReportUnavailableItemsBody>(res),
    );
    sendSuccess(res, { requests }, "Sent to Outfiqe for review.", HTTP_STATUS.CREATED);
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { groupId } = validated.params<FulfilmentGroupIdParam>(res);
    const requests = await orderUnavailableItemService.listForMyGroup(userId, groupId);
    sendSuccess(res, { requests }, "Unavailable item reports.");
  },

  async listForStaff(_req: Request, res: Response) {
    const page = await orderUnavailableItemService.listForStaff(
      validated.query<ListUnavailableItemsQuery>(res),
    );
    sendSuccess(res, page, "Unavailable item reports.");
  },

  async approve(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { requestId } = validated.params<UnavailableRequestIdParam>(res);
    const request = await orderUnavailableItemService.approve(userId, requestId);
    sendSuccess(res, request, "Approved and refunded.");
  },

  async reject(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { requestId } = validated.params<UnavailableRequestIdParam>(res);
    const request = await orderUnavailableItemService.reject(
      userId,
      requestId,
      validated.body<RejectUnavailableItemBody>(res),
    );
    sendSuccess(res, request, "Report rejected.");
  },
};
