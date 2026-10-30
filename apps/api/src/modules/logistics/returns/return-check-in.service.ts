import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  BrandReturnSource,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { toE164PhoneNumber } from "#lib/phone.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { orderService } from "#modules/orders/order.service.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { logisticsRefusalRepository } from "../refusals/refusal.repository.js";
import { brandIncidentRepository } from "../reliability/brand-incident.repository.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import type { RecordTrackingEventOutcome } from "../tracking/tracking.types.js";
import {
  PARCEL_STATUSES_ACCEPTING_RETURN,
  RETURN_DEDUPE_PREFIX,
  RETURN_REFUND_KEY_PREFIX,
  RETURN_REFUND_REASONS,
} from "./return.constants.js";
import {
  type BrandReturnLineInput,
  logisticsReturnRepository,
  type ParcelForReturn,
} from "./return.repository.js";
import type { CheckInReturnedParcelBody } from "./return.schemas.js";
import type { ReturnedParcelView } from "./return.types.js";
import {
  calculateGoodsStillInParcel,
  isReturnGradingComplete,
  resolveReturnOutcome,
  type ReturnOutcomeRules,
  unitsStillInParcel,
} from "./return-outcome.utils.js";

const NO_UNITS = 0;
const SHIPMENT_AUDIT_TARGET_TYPE = "shipment";

type TransactionClient = Prisma.TransactionClient;

const requireParcelAwaitingReturn = async (shipmentId: string): Promise<ParcelForReturn> => {
  const parcel = await logisticsReturnRepository.findParcelForReturn(prisma, shipmentId);
  if (!parcel) throw new AppError("PARCEL_NOT_FOUND", "Parcel not found.", HTTP_STATUS.NOT_FOUND);
  if (parcel.returnCheckedInAt) {
    throw new AppError(
      "PARCEL_RETURN_ALREADY_CHECKED_IN",
      "This parcel's return has already been checked in.",
      HTTP_STATUS.CONFLICT,
    );
  }
  if (!PARCEL_STATUSES_ACCEPTING_RETURN.has(parcel.status)) {
    throw new AppError(
      "PARCEL_NOT_COMING_BACK",
      "Only a parcel that went out with a delivery partner can be checked back in.",
      HTTP_STATUS.CONFLICT,
    );
  }
  return parcel;
};

const parcelItemsOf = (parcel: ParcelForReturn) =>
  parcel.fulfilmentGroups.flatMap(({ items }) => items);

const toRefundLines = (parcel: ParcelForReturn) =>
  parcelItemsOf(parcel).flatMap((item) => {
    const qty = unitsStillInParcel(item);
    return qty > NO_UNITS ? [{ orderItemId: item.id, qty }] : [];
  });

const recordReturnEvents = async (
  tx: TransactionClient,
  parcel: ParcelForReturn,
  staffUserId: string,
  occurredAt: Date,
): Promise<RecordTrackingEventOutcome[]> => {
  await logisticsTrackingService.recordEventInTransaction(tx, {
    subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId: parcel.id },
    code: TrackingEventCode.RETURNED_TO_HUB,
    source: TrackingEventSource.HUB,
    actorUserId: staffUserId,
    dedupeKey: `${RETURN_DEDUPE_PREFIX.PARCEL_RETURNED}:${parcel.id}`,
    occurredAt,
  });
  const pickupOutcomes: RecordTrackingEventOutcome[] = [];
  for (const { id: fulfilmentGroupId } of parcel.fulfilmentGroups) {
    pickupOutcomes.push(
      await logisticsTrackingService.recordEventInTransaction(tx, {
        subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId },
        code: TrackingEventCode.RETURN_AT_HUB,
        source: TrackingEventSource.HUB,
        actorUserId: staffUserId,
        dedupeKey: `${RETURN_DEDUPE_PREFIX.PICKUP_RETURNED}:${fulfilmentGroupId}:${parcel.id}`,
        occurredAt,
      }),
    );
  }
  return pickupOutcomes;
};

const createBrandReturns = async (
  tx: TransactionClient,
  parcel: ParcelForReturn,
  lines: CheckInReturnedParcelBody["lines"],
): Promise<string[]> => {
  const linesByItemId = new Map(lines.map((line) => [line.orderItemId, line]));
  const brandReturnIds: string[] = [];
  for (const group of parcel.fulfilmentGroups) {
    const groupLines: BrandReturnLineInput[] = group.items.flatMap(({ id }) => {
      const line = linesByItemId.get(id);
      return line ? [line] : [];
    });
    if (groupLines.length === NO_UNITS) continue;
    const { id } = await logisticsReturnRepository.createBrandReturn(tx, {
      brandId: group.brandId,
      hubId: parcel.hubId,
      fulfilmentGroupId: group.id,
      shipmentId: parcel.id,
      source: BrandReturnSource.PARCEL_RETURNED,
      lines: groupLines,
    });
    brandReturnIds.push(id);
  }
  return brandReturnIds;
};

const recordOutcomeConsequences = async (
  tx: TransactionClient,
  parcel: ParcelForReturn,
  rules: ReturnOutcomeRules,
  occurredAt: Date,
) => {
  const { order } = parcel;
  if (rules.recordsRefusal) {
    await logisticsRefusalRepository.recordRefusal(tx, {
      userId: order.userId,
      phoneE164: order.phoneE164 ?? toE164PhoneNumber(order.phone, order.countryCode),
      orderId: parcel.orderId,
      shipmentId: parcel.id,
      refusedAt: occurredAt,
    });
  }
  const { brandIncidentKind } = rules;
  if (brandIncidentKind) {
    await brandIncidentRepository.recordIncidents(
      tx,
      parcel.fulfilmentGroups.map(({ id, brandId }) => ({
        brandId,
        kind: brandIncidentKind,
        sourceKey: `${parcel.id}:${id}`,
        orderId: parcel.orderId,
        note: "Wrong or damaged item found when the parcel came back",
        occurredAt,
      })),
    );
  }
};

type ParcelAwaitingReturn = Awaited<ReturnType<typeof requireParcelAwaitingReturn>>;

const refundReturnedParcel = async ({
  staffUserId,
  shipmentId,
  parcel,
  refundCause,
  reason,
}: {
  staffUserId: string;
  shipmentId: string;
  parcel: ParcelAwaitingReturn;
  refundCause: ReturnType<typeof resolveReturnOutcome>["refundCause"];
  reason: string;
}) => {
  const refundLines = toRefundLines(parcel);
  if (refundLines.length <= NO_UNITS) return null;

  return orderService.refundOrderItems(
    staffUserId,
    parcel.orderId,
    { lines: refundLines, cause: refundCause, reason, restock: false },
    `${RETURN_REFUND_KEY_PREFIX}:${shipmentId}`,
  );
};

export const logisticsReturnCheckInService = {
  async checkInReturnedParcel(
    staffUserId: string,
    shipmentId: string,
    { outcome, lines, note }: CheckInReturnedParcelBody,
  ): Promise<ReturnedParcelView> {
    const parcel = await requireParcelAwaitingReturn(shipmentId);
    const parcelItems = parcelItemsOf(parcel);
    if (!isReturnGradingComplete(parcelItems, lines)) {
      throw new AppError(
        "RETURN_GRADING_INCOMPLETE",
        "Grade every unit still in the parcel as resellable or damaged, once.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const rules = resolveReturnOutcome(outcome);
    const partnerClaimAmount = rules.opensPartnerClaim
      ? calculateGoodsStillInParcel(parcelItems)
      : null;

    const refund = await refundReturnedParcel({
      staffUserId,
      shipmentId,
      parcel,
      refundCause: rules.refundCause,
      reason: note ?? RETURN_REFUND_REASONS[outcome],
    });

    const checkedInAt = new Date();
    const { brandReturnIds, pickupOutcomes } = await prisma.$transaction(async (tx) => {
      const isCheckedIn = await logisticsReturnRepository.markReturnCheckedIn(tx, {
        shipmentId,
        outcome,
        checkedInById: staffUserId,
        checkedInAt,
        partnerClaimAmount,
      });
      if (!isCheckedIn) {
        throw new AppError(
          "PARCEL_RETURN_ALREADY_CHECKED_IN",
          "This parcel's return has already been checked in.",
          HTTP_STATUS.CONFLICT,
        );
      }
      const returnPickupOutcomes = await recordReturnEvents(tx, parcel, staffUserId, checkedInAt);
      const createdReturnIds = await createBrandReturns(tx, parcel, lines);
      await recordOutcomeConsequences(tx, parcel, rules, checkedInAt);
      return { brandReturnIds: createdReturnIds, pickupOutcomes: returnPickupOutcomes };
    });
    for (const pickupOutcome of pickupOutcomes) {
      await logisticsTrackingService.announceStageChange(pickupOutcome);
    }

    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.LOGISTICS_PARCEL_RETURN_CHECKED_IN,
      summary: `Checked in returned parcel ${parcel.trackingCode}: ${outcome}`,
      onBehalfOfUserId: parcel.order.userId,
      targetType: SHIPMENT_AUDIT_TARGET_TYPE,
      targetId: shipmentId,
      metadata: { outcome, lines, refundId: refund?.id ?? null, partnerClaimAmount },
    });

    return {
      shipmentId,
      outcome,
      refundId: refund?.id ?? null,
      brandReturnIds,
      recordedRefusal: rules.recordsRefusal,
      partnerClaimAmount,
    };
  },
};
