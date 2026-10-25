import { formatParcelCode } from "@outfiqe/utils";

import {
  type DeliveryPartnerConnection,
  ItemInspectionStatus,
  type PartnerBookingStatus,
  PickupStatus,
} from "#generated/prisma/enums.js";

import type { ParcelBookingSummary } from "../hub-operations/hub-operation.types.js";
import { PICKUP_STATUSES_NOT_COMING_TO_HUB } from "../logistics.constants.js";
import type {
  OrderToPackRecord,
  ShipmentDetailRecord,
  ShipmentSummaryRecord,
} from "./shipment.repository.js";
import type { OrderToPackView, ShipmentDetailView, ShipmentSummaryView } from "./shipment.types.js";

type OrderToPackPickup = OrderToPackRecord["fulfilmentGroups"][number];

type BookingForSummary = {
  id: string;
  partnerId: string;
  status: PartnerBookingStatus;
  connection: DeliveryPartnerConnection;
  merchantReference: string;
  partnerReference: string | null;
  partnerTrackingUrl: string | null;
  failureReason: string | null;
  partner: { name: string };
};

const isAtHubUnpacked = ({ pickupStatus, shipmentId }: OrderToPackPickup) =>
  pickupStatus === PickupStatus.AT_HUB && shipmentId === null;

const hasUnitsLeftForCustomer = ({ items }: OrderToPackPickup) =>
  items.some(({ qty, refundedQty }) => refundedQty < qty);

export const toParcelBookingSummary = (booking: BookingForSummary): ParcelBookingSummary => ({
  bookingId: booking.id,
  partnerId: booking.partnerId,
  partnerName: booking.partner.name,
  status: booking.status,
  connection: booking.connection,
  merchantReference: booking.merchantReference,
  partnerReference: booking.partnerReference,
  partnerTrackingUrl: booking.partnerTrackingUrl,
  failureReason: booking.failureReason,
});

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
    booking: liveBooking ? toParcelBookingSummary(liveBooking) : null,
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
  codCollectedAmount: shipment.codCollectedAmount,
  codRemittanceId: shipment.codRemittanceLine?.remittanceId ?? null,
  labelPrintedAt: shipment.labelPrintedAt?.toISOString() ?? null,
  returnOutcome: shipment.returnOutcome,
  returnCheckedInAt: shipment.returnCheckedInAt?.toISOString() ?? null,
  partnerClaimAmount: shipment.partnerClaimAmount,
  partnerClaimStatus: shipment.partnerClaimStatus,
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
    (pickup) => isAtHubUnpacked(pickup) && hasUnitsLeftForCustomer(pickup),
  );
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
      .filter((pickup) => !isAtHubUnpacked(pickup))
      .map(({ id, brand, pickupStatus }) => ({
        fulfilmentGroupId: id,
        brandName: brand.name,
        pickupStatus,
      })),
  };
};
