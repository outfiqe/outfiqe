import { formatParcelCode } from "@outfiqe/utils";
import { isAfter } from "date-fns/isAfter";
import { subDays } from "date-fns/subDays";

import { ShipmentStatus } from "#generated/prisma/enums.js";

import {
  DELIVERY_DISPUTE_WINDOW_DAYS,
  PARTNER_REFERENCE_PLACEHOLDER,
} from "./customer-tracking.constants.js";
import type { CustomerParcelRecord } from "./customer-tracking.repository.js";
import type { CustomerParcelView, CustomerTrackingEventView } from "./customer-tracking.types.js";

const NO_DISPUTES = 0;

type BookingForTrackingLink = CustomerParcelRecord["bookings"][number];

type EventForCustomer = {
  id: string;
  code: CustomerTrackingEventView["code"];
  occurredAt: Date;
  location: string | null;
  reasonCode: CustomerTrackingEventView["reasonCode"];
  shipmentId: string | null;
  fulfilmentGroup: { brand: { name: string } } | null;
};

export const buildPartnerTrackingUrl = ({
  partnerTrackingUrl,
  partnerReference,
  partner,
}: BookingForTrackingLink): string | null => {
  if (partnerTrackingUrl) return partnerTrackingUrl;
  if (!partner.trackingUrlTemplate || !partnerReference) return null;
  return partner.trackingUrlTemplate.replace(
    PARTNER_REFERENCE_PLACEHOLDER,
    encodeURIComponent(partnerReference),
  );
};

export const isReportedNotReceived = ({ trackingEvents }: CustomerParcelRecord): boolean =>
  trackingEvents.length > NO_DISPUTES;

export const isWithinDisputeWindow = (
  { status, deliveredAt }: Pick<CustomerParcelRecord, "status" | "deliveredAt">,
  now: Date,
): boolean =>
  status === ShipmentStatus.DELIVERED &&
  deliveredAt !== null &&
  isAfter(deliveredAt, subDays(now, DELIVERY_DISPUTE_WINDOW_DAYS));

export const toCustomerParcelView = (
  parcel: CustomerParcelRecord,
  now: Date,
): CustomerParcelView => {
  const [booking] = parcel.bookings;
  const hasReported = isReportedNotReceived(parcel);
  return {
    shipmentId: parcel.id,
    trackingCode: formatParcelCode(parcel.trackingCode),
    status: parcel.status,
    partnerName: booking?.partner.name ?? null,
    partnerTrackingUrl: booking ? buildPartnerTrackingUrl(booking) : null,
    deliveredAt: parcel.deliveredAt?.toISOString() ?? null,
    canReportNotReceived: !hasReported && isWithinDisputeWindow(parcel, now),
    isReportedNotReceived: hasReported,
  };
};

export const toCustomerTrackingEventView = ({
  id,
  code,
  occurredAt,
  location,
  reasonCode,
  shipmentId,
  fulfilmentGroup,
}: EventForCustomer): CustomerTrackingEventView => ({
  id,
  code,
  occurredAt: occurredAt.toISOString(),
  brandName: fulfilmentGroup?.brand.name ?? null,
  location,
  reasonCode,
  shipmentId,
});
