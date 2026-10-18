import { prisma } from "#db/prisma.js";
import { TrackingEventCode, TrackingEventSource } from "#generated/prisma/enums.js";
import { orderService } from "#modules/orders/order.service.js";

import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { logisticsHubOperationRepository } from "./hub-operation.repository.js";

const COD_CHANGED_DEDUPE_PREFIX = "cod-amount-changed";

const calculateParcelCash = async (params: {
  orderId: string;
  fulfilmentGroupIds: readonly string[];
  isFirstParcelOfOrder: boolean;
}): Promise<number> =>
  orderService.calculateCashToCollect({
    orderId: params.orderId,
    fulfilmentGroupIds: params.fulfilmentGroupIds,
    includesOrderFees: params.isFirstParcelOfOrder,
  });

const refreshParcelCash = async (shipmentId: string) => {
  const shipment = await logisticsHubOperationRepository.findShipmentForMoney(prisma, shipmentId);
  if (!shipment) return null;
  const firstShipmentId = await logisticsHubOperationRepository.findFirstShipmentIdForOrder(
    prisma,
    shipment.orderId,
  );
  const codAmountToCollect = await calculateParcelCash({
    orderId: shipment.orderId,
    fulfilmentGroupIds: shipment.fulfilmentGroups.map(({ id }) => id),
    isFirstParcelOfOrder: firstShipmentId === shipment.id,
  });
  if (codAmountToCollect === shipment.codAmountToCollect) return shipment;

  await prisma.$transaction(async (tx) => {
    await logisticsHubOperationRepository.setCodAmountToCollect(tx, shipmentId, codAmountToCollect);
    await logisticsTrackingService.recordEventInTransaction(tx, {
      subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId },
      code: TrackingEventCode.COD_AMOUNT_CHANGED,
      source: TrackingEventSource.SYSTEM,
      dedupeKey: `${COD_CHANGED_DEDUPE_PREFIX}:${shipmentId}:${shipment.codAmountToCollect}:${codAmountToCollect}`,
      occurredAt: new Date(),
      note: `Cash to collect changed from ${shipment.codAmountToCollect} to ${codAmountToCollect}.`,
    });
  });
  return { ...shipment, codAmountToCollect };
};

export const logisticsParcelCash = {
  calculateParcelCash,
  refreshParcelCash,
};
