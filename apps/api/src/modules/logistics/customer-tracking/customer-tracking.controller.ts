import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { CustomerOrderParam, ReportNotReceivedBody } from "./customer-tracking.schemas.js";
import { logisticsCustomerTrackingService } from "./customer-tracking.service.js";

export const logisticsCustomerTrackingController = {
  async getTracking(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<CustomerOrderParam>(res);
    const tracking = await logisticsCustomerTrackingService.getCustomerOrderTracking(
      userId,
      orderId,
    );
    sendSuccess(res, tracking, "Order tracking.");
  },

  async reportNotReceived(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<CustomerOrderParam>(res);
    const parcel = await logisticsCustomerTrackingService.reportNotReceived(
      userId,
      orderId,
      validated.body<ReportNotReceivedBody>(res),
    );
    sendSuccess(
      res,
      parcel,
      "Thanks for telling us. Our team will be in touch.",
      HTTP_STATUS.CREATED,
    );
  },
};
