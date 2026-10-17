import { formatParcelCode } from "@outfiqe/utils";

import { ItemInspectionStatus, PickupStatus } from "#generated/prisma/enums.js";

import { PICKUP_STATUSES_NOT_COMING_TO_HUB } from "../logistics.constants.js";
import type {
  OrderToPackRecord,
  ShipmentDetailRecord,
  ShipmentSummaryRecord,
} from "./shipment.repository.js";
import type { OrderToPackView, ShipmentDetailView, ShipmentSummaryView } from "./shipment.types.js";

export const toShipmentSummaryView = (shipment: ShipmentSummaryRecord): ShipmentSummaryView => {
  const [liveBooking] = shipment.bookings;
  return {
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    trackingCode: shipment.trackingCode,
    displayTrackingCode: formatParcelCode(shipment.trackingCode),
    status: shipment.status,
    codAmountToCollect: shipment.codAmountToCollect,
    isLabelUpToDate: shipment.labelCodAmount === shipment.codAmountToCollect,
    recipientName: shipment.order.fullName,
    city: shipment.order.city,
    packedAt: shipment.createdAt.toISOString(),
    lastEventAt: shipment.lastEventAt.toISOString(),
    booking: liveBooking
      ? {
          bookingId: liveBooking.id,
          partnerId: liveBooking.partnerId,
          partnerName: liveBooking.partner.name,
          status: liveBooking.status,
          merchantReference: liveBooking.merchantReference,
          partnerReference: liveBooking.partnerReference,
        }
      : null,
  };
};

export const toShipmentDetailView = (shipment: ShipmentDetailRecord): ShipmentDetailView => ({
  ...toShipmentSummaryView(shipment),
  hubId: shipment.hubId,
  currency: shipment.currency,
  weightGrams: shipment.weightGrams,
  parcelCount: shipment.parcelCount,
  deliveryAttemptCount: shipment.deliveryAttemptCount,
  deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
  labelPrintedAt: shipment.labelPrintedAt?.toISOString() ?? null,
  pickups: shipment.fulfilmentGroups.map(({ id, brand, items }) => ({
    fulfilmentGroupId: id,
    brandName: brand.name,
    items: items.map(({ id: orderItemId, qty, refundedQty, product, size }) => ({
      orderItemId,
      productName: product.name,
      sizeLabel: size.label,
      units: qty - refundedQty,
    })),
  })),
  events: shipment.trackingEvents.map(({ occurredAt, partner, actorUser, ...event }) => ({
    ...event,
    occurredAt: occurredAt.toISOString(),
    partnerName: partner?.name ?? null,
    actorName: actorUser?.name ?? null,
  })),
});

export const toOrderToPackView = (order: OrderToPackRecord, hubId: string): OrderToPackView => {
  const hubPickups = order.fulfilmentGroups.filter((pickup) => pickup.hubId === hubId);
  const pickupsAtHub = hubPickups.filter(
    ({ pickupStatus, shipmentId }) => pickupStatus === PickupStatus.AT_HUB && shipmentId === null,
  );
  const atHubIds = new Set(pickupsAtHub.map(({ id }) => id));
  return {
    orderId: order.id,
    placedAt: order.createdAt.toISOString(),
    customerName: order.fullName,
    city: order.city,
    paymentMethod: order.paymentMethod,
    pickupsStillComing: hubPickups.filter(
      ({ pickupStatus }) =>
        pickupStatus !== null && !PICKUP_STATUSES_NOT_COMING_TO_HUB.has(pickupStatus),
    ).length,
    pickupsAtHub: pickupsAtHub.map(({ id, brand, items }) => ({
      fulfilmentGroupId: id,
      brandName: brand.name,
      isInspected: items.every(
        ({ inspectionStatus }) => inspectionStatus !== ItemInspectionStatus.NOT_INSPECTED,
      ),
      items: items.map(
        ({ id: orderItemId, qty, refundedQty, inspectionStatus, failedQty, product, size }) => ({
          orderItemId,
          productName: product.name,
          sizeLabel: size.label,
          units: qty - refundedQty,
          inspectionStatus,
          failedQty,
        }),
      ),
    })),
    otherPickups: hubPickups
      .filter(({ id }) => !atHubIds.has(id))
      .map(({ id, brand, pickupStatus }) => ({
        fulfilmentGroupId: id,
        brandName: brand.name,
        pickupStatus,
      })),
  };
};
