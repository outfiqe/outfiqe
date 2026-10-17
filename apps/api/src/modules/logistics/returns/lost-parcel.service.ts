import { prisma } from "#db/prisma.js";
import { OrderRefundCause, ShipmentStatus } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { orderService } from "#modules/orders/order.service.js";

import { LOST_PARCEL_REFUND_REASON } from "./return.constants.js";
import { logisticsReturnRepository } from "./return.repository.js";
import { calculateGoodsStillInParcel, unitsStillInParcel } from "./return-outcome.utils.js";

const NO_UNITS = 0;

export const logisticsLostParcelService = {
  async settleLostParcel(shipmentId: string): Promise<void> {
    const parcel = await logisticsReturnRepository.findParcelForReturn(prisma, shipmentId);
    if (parcel?.status !== ShipmentStatus.LOST) return;

    const parcelItems = parcel.fulfilmentGroups.flatMap(({ items }) => items);
    const partnerClaimAmount = calculateGoodsStillInParcel(parcelItems);
    const refundLines = parcelItems.flatMap((item) => {
      const qty = unitsStillInParcel(item);
      return qty > NO_UNITS ? [{ orderItemId: item.id, qty }] : [];
    });

    if (refundLines.length > NO_UNITS) {
      await orderService.refundOrderItemsBySystem(parcel.orderId, {
        lines: refundLines,
        cause: OrderRefundCause.PARTNER_FAILED,
        reason: LOST_PARCEL_REFUND_REASON,
      });
    }
    const isClaimOpened = await logisticsReturnRepository.openPartnerClaim(prisma, {
      shipmentId,
      partnerClaimAmount,
    });
    if (isClaimOpened) {
      logger.warn(`Parcel ${parcel.trackingCode} was lost; a partner claim is open`);
    }
  },
};
