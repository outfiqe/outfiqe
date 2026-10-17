import { toE164PhoneNumber } from "#lib/phone.utils.js";
import { OUTBOX_JOB_ATTEMPTS } from "#outbox/outbox.constants.js";

import type { PartnerBookingRequest } from "../partners/adapters/partner-adapter.types.js";
import type { BookingForApiRequest } from "./partner-booking.repository.js";

const NO_UNITS = 0;
const CONTENTS_DESCRIPTION = "Clothing and accessories";

export const MAX_AUTOMATIC_BOOKING_ATTEMPTS = OUTBOX_JOB_ATTEMPTS;

type ParcelItem = { qty: number; refundedQty: number; unitPrice: number };

const unitsStillInParcel = ({ qty, refundedQty }: ParcelItem) =>
  Math.max(qty - refundedQty, NO_UNITS);

export const calculateDeclaredValue = (parcelItems: readonly ParcelItem[]): number =>
  parcelItems.reduce(
    (declaredValue, parcelItem) =>
      declaredValue + unitsStillInParcel(parcelItem) * parcelItem.unitPrice,
    NO_UNITS,
  );

export const hasBeenTriedBefore = ({
  lastAttemptAt,
}: Pick<BookingForApiRequest, "lastAttemptAt">) => lastAttemptAt !== null;

export const isLastAutomaticAttempt = (attemptNumber: number): boolean =>
  attemptNumber >= MAX_AUTOMATIC_BOOKING_ATTEMPTS;

export const toPartnerBookingRequest = ({
  id,
  merchantReference,
  shipment,
}: BookingForApiRequest): PartnerBookingRequest => {
  const { hub, order, fulfilmentGroups } = shipment;
  return {
    merchantReference,
    idempotencyKey: id,
    pickup: {
      name: hub.name,
      phoneE164: hub.phoneE164,
      address: {
        line1: hub.address,
        landmark: null,
        city: hub.city,
        region: null,
        postalCode: null,
        countryCode: hub.countryCode,
      },
    },
    recipient: {
      fullName: order.fullName,
      phoneE164:
        order.phoneE164 ?? toE164PhoneNumber(order.phone, order.countryCode) ?? order.phone,
      address: {
        line1: order.address,
        landmark: order.landmark,
        city: order.city,
        region: order.region,
        postalCode: order.postalCode,
        countryCode: order.countryCode,
      },
    },
    currency: shipment.currency,
    codAmount: shipment.codAmountToCollect,
    declaredValue: calculateDeclaredValue(fulfilmentGroups.flatMap(({ items }) => items)),
    weightGrams: shipment.weightGrams,
    parcelCount: shipment.parcelCount,
    contentsDescription: CONTENTS_DESCRIPTION,
  };
};
