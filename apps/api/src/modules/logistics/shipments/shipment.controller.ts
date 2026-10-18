import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ListOrdersToPackQuery,
  ListShipmentsQuery,
  RecordParcelEventBody,
  ShipmentIdParam,
} from "./shipment.schemas.js";
import { logisticsShipmentService } from "./shipment.service.js";

export const logisticsShipmentController = {
  async listShipments(_req: Request, res: Response) {
    const page = await logisticsShipmentService.listHubShipments(
      validated.query<ListShipmentsQuery>(res),
    );
    sendSuccess(res, page, "Parcels.");
  },

  async getShipment(_req: Request, res: Response) {
    const { shipmentId } = validated.params<ShipmentIdParam>(res);
    sendSuccess(res, await logisticsShipmentService.getShipmentDetail(shipmentId), "Parcel.");
  },

  async listOrdersToPack(_req: Request, res: Response) {
    const page = await logisticsShipmentService.listOrdersToPack(
      validated.query<ListOrdersToPackQuery>(res),
    );
    sendSuccess(res, page, "Orders to pack.");
  },

  async recordEvent(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { shipmentId } = validated.params<ShipmentIdParam>(res);
    const shipment = await logisticsShipmentService.recordParcelEvent(
      userId,
      shipmentId,
      validated.body<RecordParcelEventBody>(res),
    );
    sendSuccess(res, shipment, "Parcel updated.");
  },
};
