import { createHash } from "node:crypto";

import { normalizeParcelCode } from "@outfiqe/utils";

import type { PartnerTrackingEvent } from "./adapters/partner-adapter.types.js";

const WHITESPACE_RUN_PATTERN = /\s+/g;
const REBOOK_SUFFIX_PATTERN = /-\d+$/;
const DEDUPE_KEY_SEPARATOR = "|";
const HASHED_DEDUPE_KEY_PREFIX = "partner-sha256";
const NO_EARLIER_BOOKINGS = 0;
const NEXT_BOOKING_NUMBER_STEP = 1;

export const normalizePartnerRawStatus = (rawStatus: string): string =>
  rawStatus.trim().replace(WHITESPACE_RUN_PATTERN, " ").toUpperCase();

export const normalizePartnerReference = (partnerReference: string): string =>
  partnerReference.trim();

export const parcelCodeFromMerchantReference = (merchantReference: string): string | null =>
  normalizeParcelCode(merchantReference.trim().replace(REBOOK_SUFFIX_PATTERN, ""));

export const merchantReferenceForBooking = (
  trackingCode: string,
  earlierBookingsWithPartner: number,
): string =>
  earlierBookingsWithPartner === NO_EARLIER_BOOKINGS
    ? trackingCode
    : `${trackingCode}-${earlierBookingsWithPartner + NEXT_BOOKING_NUMBER_STEP}`;

export const buildPartnerEventDedupeKey = ({
  partnerEventId,
  bookingId,
  rawStatus,
  occurredAt,
}: Pick<PartnerTrackingEvent, "partnerEventId" | "rawStatus" | "occurredAt"> & {
  bookingId: string;
}): string => {
  if (partnerEventId) return partnerEventId;
  const eventFingerprint = [
    bookingId,
    normalizePartnerRawStatus(rawStatus),
    occurredAt.toISOString(),
  ].join(DEDUPE_KEY_SEPARATOR);
  return `${HASHED_DEDUPE_KEY_PREFIX}:${createHash("sha256").update(eventFingerprint).digest("hex")}`;
};

export const compileReferencePattern = (referencePattern: string): RegExp | null => {
  try {
    return new RegExp(`^(?:${referencePattern})$`);
  } catch {
    return null;
  }
};

const BROKEN_PATTERN_ALLOWS_REFERENCE = false;

export const isReferenceAllowedByPattern = (
  referencePattern: string | null,
  partnerReference: string,
): boolean =>
  referencePattern === null ||
  (compileReferencePattern(referencePattern)?.test(partnerReference) ??
    BROKEN_PATTERN_ALLOWS_REFERENCE);
