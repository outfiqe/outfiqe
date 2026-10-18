import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { readRequiredIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validated } from "#middlewares/validate.js";

import type {
  CheckInPickupBody,
  FulfilmentGroupIdParam,
  HandOverParcelBody,
  OrderIdParam,
  PackParcelBody,
  RebookParcelBody,
  RecordInspectionBody,
  RecordManualBookingBody,
  ShipmentIdParam,
} from "./hub-operation.schemas.js";
import { logisticsHubOperationService } from "./hub-operation.service.js";

export const logisticsHubOperationController = {
  async checkIn(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const checkIn = await logisticsHubOperationService.checkInPickup(
      userId,
      validated.body<CheckInPickupBody>(res),
      readRequiredIdempotencyKey(req),
    );
    sendSuccess(res, checkIn, "Bag checked in.");
  },

  async recordInspection(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { groupId } = validated.params<FulfilmentGroupIdParam>(res);
    const inspection = await logisticsHubOperationService.recordInspection(
      userId,
      groupId,
      validated.body<RecordInspectionBody>(res),
    );
    sendSuccess(res, inspection, "Inspection saved.");
  },

  async packParcel(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<OrderIdParam>(res);
    const parcel = await logisticsHubOperationService.packParcel(
      userId,
      orderId,
      validated.body<PackParcelBody>(res),
    );
    sendSuccess(res, parcel, "Parcel packed.", HTTP_STATUS.CREATED);
  },

  async recordManualBooking(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { shipmentId } = validated.params<ShipmentIdParam>(res);
    const booking = await logisticsHubOperationService.recordManualBooking(
      userId,
      shipmentId,
      validated.body<RecordManualBookingBody>(res),
    );
    sendSuccess(res, booking, "Booking saved.");
  },

  async retryParcelBooking(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { shipmentId } = validated.params<ShipmentIdParam>(res);
    const booking = await logisticsHubOperationService.retryParcelBooking(userId, shipmentId);
    sendSuccess(res, booking, "Booking sent to the partner again.");
  },

  async rebookParcel(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { shipmentId } = validated.params<ShipmentIdParam>(res);
    const booking = await logisticsHubOperationService.rebookParcel(
      userId,
      shipmentId,
      validated.body<RebookParcelBody>(res),
    );
    sendSuccess(res, booking, "Partner changed.");
  },

  async getLabel(_req: Request, res: Response) {
    const { shipmentId } = validated.params<ShipmentIdParam>(res);
    sendSuccess(
      res,
      await logisticsHubOperationService.getParcelLabel(shipmentId),
      "Parcel label.",
    );
  },

  async markLabelPrinted(_req: Request, res: Response) {
    const { shipmentId } = validated.params<ShipmentIdParam>(res);
    const label = await logisticsHubOperationService.markParcelLabelPrinted(shipmentId);
    sendSuccess(res, label, "Label marked as printed.");
  },

  async handOver(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const handover = await logisticsHubOperationService.handOverParcel(
      userId,
      validated.body<HandOverParcelBody>(res),
      readRequiredIdempotencyKey(req),
    );
    sendSuccess(res, handover, "Parcel handed over.");
  },
};
