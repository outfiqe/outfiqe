import { subDays } from "date-fns/subDays";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError, uniqueConstraintTargetIncludes } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { logisticsErrors } from "../logistics.errors.js";
import { logisticsCodRepository } from "./cod.repository.js";
import type {
  ListCodRemittancesQuery,
  ListUnremittedParcelsQuery,
  RecordCodRemittanceBody,
} from "./cod.schemas.js";
import type {
  CodPartnerSummaryView,
  CodRemittanceDetailView,
  CodRemittanceSummaryView,
  UnremittedParcelView,
} from "./cod.types.js";
import {
  toCodPartnerSummaryView,
  toCodRemittanceDetailView,
  toCodRemittanceSummaryView,
  toUnremittedParcelView,
} from "./cod.utils.js";

const COD_REMITTANCE_AUDIT_TARGET_TYPE = "CodRemittance";
const REMITTANCE_REFERENCE_COLUMN = "reference";
const NO_AMOUNT = 0;
const NO_OTHER_CURRENCIES = 0;
const INVALID_REMITTANCE_STATUS = HTTP_STATUS.UNPROCESSABLE_ENTITY;

type TransactionClient = Prisma.TransactionClient;
type ParcelToRemit = {
  id: string;
  trackingCode: string;
  currency: string;
  collectedAmount: number;
};
type RemittanceLine = { shipmentId: string; collectedAmount: number; partnerFeeAmount: number };

const partnerNotFoundError = () => logisticsErrors.partnerNotFound();

const requirePartnerForCash = async (partnerId: string) => {
  const partner = await logisticsCodRepository.findPartnerForCash(partnerId);
  if (!partner) throw partnerNotFoundError();
  return partner;
};

const requireParcelsToRemit = async (
  tx: TransactionClient,
  { partnerId, lines }: RecordCodRemittanceBody,
): Promise<{ parcels: ParcelToRemit[]; currency: string }> => {
  const parcels = await logisticsCodRepository.listParcelsToRemit(
    tx,
    partnerId,
    lines.map(({ shipmentId }) => shipmentId),
  );
  const parcelsToRemit = parcels.flatMap(({ codCollectedAmount, ...parcel }) =>
    codCollectedAmount === null ? [] : [{ ...parcel, collectedAmount: codCollectedAmount }],
  );
  if (parcelsToRemit.length !== lines.length) {
    throw new AppError(
      "PARCELS_NOT_REMITTABLE",
      "Some ticked parcels aren't delivered cash parcels of this partner, or were already paid in.",
      HTTP_STATUS.CONFLICT,
    );
  }
  const [currency, ...otherCurrencies] = new Set(parcelsToRemit.map((parcel) => parcel.currency));
  if (currency === undefined || otherCurrencies.length > NO_OTHER_CURRENCIES) {
    throw new AppError(
      "REMITTANCE_MIXED_CURRENCIES",
      "One payment can only cover parcels in one currency.",
      INVALID_REMITTANCE_STATUS,
    );
  }
  return { parcels: parcelsToRemit, currency };
};

const buildRemittanceLines = (
  parcels: ParcelToRemit[],
  lines: RecordCodRemittanceBody["lines"],
): RemittanceLine[] => {
  const feeByShipmentId = new Map(
    lines.map(({ shipmentId, partnerFeeAmount }) => [shipmentId, partnerFeeAmount]),
  );
  return parcels.map(({ id, trackingCode, collectedAmount }) => {
    const partnerFeeAmount = feeByShipmentId.get(id) ?? NO_AMOUNT;
    if (partnerFeeAmount > collectedAmount) {
      throw new AppError(
        "PARTNER_FEE_TOO_HIGH",
        `The fee on parcel ${trackingCode} is more than the cash collected for it.`,
        INVALID_REMITTANCE_STATUS,
      );
    }
    return { shipmentId: id, collectedAmount, partnerFeeAmount };
  });
};

const sumAmounts = (amounts: number[]): number =>
  amounts.reduce((total, amount) => total + amount, NO_AMOUNT);

const recordRemittanceInTransaction = async (
  tx: TransactionClient,
  staffUserId: string,
  body: RecordCodRemittanceBody,
): Promise<{ id: string }> => {
  const { parcels, currency } = await requireParcelsToRemit(tx, body);
  const lines = buildRemittanceLines(parcels, body.lines);
  const collectedAmount = sumAmounts(lines.map((line) => line.collectedAmount));
  const partnerFeeAmount = sumAmounts(lines.map((line) => line.partnerFeeAmount));
  const expectedReceivedAmount = collectedAmount - partnerFeeAmount;
  if (body.receivedAmount !== expectedReceivedAmount) {
    throw new AppError(
      "REMITTANCE_TOTAL_MISMATCH",
      `The ticked parcels come to ${expectedReceivedAmount} after fees, not ${body.receivedAmount}. Check the parcels and fees.`,
      INVALID_REMITTANCE_STATUS,
    );
  }
  return logisticsCodRepository.createRemittance(tx, {
    partnerId: body.partnerId,
    reference: body.reference,
    currency,
    receivedAt: body.receivedAt,
    collectedAmount,
    partnerFeeAmount,
    receivedAmount: body.receivedAmount,
    ...(body.note ? { note: body.note } : {}),
    recordedById: staffUserId,
    lines,
  });
};

const toDuplicateRemittanceError = (error: unknown): unknown => {
  if (!isUniqueConstraintError(error)) return error;
  return uniqueConstraintTargetIncludes(error, REMITTANCE_REFERENCE_COLUMN)
    ? new AppError(
        "REMITTANCE_ALREADY_RECORDED",
        "A payment with this reference is already recorded for this partner.",
        HTTP_STATUS.CONFLICT,
      )
    : new AppError(
        "PARCELS_NOT_REMITTABLE",
        "Some ticked parcels were just paid in on another payment. Reload and try again.",
        HTTP_STATUS.CONFLICT,
      );
};

const requireRemittanceDetail = async (remittanceId: string): Promise<CodRemittanceDetailView> => {
  const remittance = await logisticsCodRepository.findRemittance(remittanceId);
  if (!remittance) {
    throw new AppError("REMITTANCE_NOT_FOUND", "Payment not found.", HTTP_STATUS.NOT_FOUND);
  }
  return toCodRemittanceDetailView(remittance);
};

export const logisticsCodService = {
  async summarizeUnremittedCash(): Promise<CodPartnerSummaryView[]> {
    const partnerCashRows = await logisticsCodRepository.summarizeUnremittedCashByPartner();
    return partnerCashRows.map(toCodPartnerSummaryView);
  },

  async listUnremittedParcels({
    partnerId,
    onlyOverdue,
    cursor,
    limit,
  }: ListUnremittedParcelsQuery): Promise<{
    items: UnremittedParcelView[];
    nextCursor: string | null;
  }> {
    const { codRemittanceDays } = await requirePartnerForCash(partnerId);
    const now = new Date();
    const parcels = await logisticsCodRepository.listUnremittedParcels({
      partnerId,
      ...(onlyOverdue ? { deliveredBefore: subDays(now, codRemittanceDays) } : {}),
      ...(cursor ? { cursor } : {}),
      limit,
    });
    const { items, nextCursor } = buildCursorPage(parcels, limit, ({ id }) => id);
    return {
      items: items.flatMap((parcel) => {
        const parcelView = toUnremittedParcelView(parcel, { codRemittanceDays, now });
        return parcelView ? [parcelView] : [];
      }),
      nextCursor,
    };
  },

  async recordRemittance(
    staffUserId: string,
    body: RecordCodRemittanceBody,
  ): Promise<CodRemittanceDetailView> {
    await requirePartnerForCash(body.partnerId);
    const { id: remittanceId } = await prisma
      .$transaction((tx) => recordRemittanceInTransaction(tx, staffUserId, body))
      .catch((error: unknown) => {
        throw toDuplicateRemittanceError(error);
      });
    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.LOGISTICS_COD_REMITTANCE_RECORDED,
      summary: `Recorded a cash payment of ${body.receivedAmount} for ${body.lines.length} parcels`,
      targetType: COD_REMITTANCE_AUDIT_TARGET_TYPE,
      targetId: remittanceId,
      metadata: {
        partnerId: body.partnerId,
        reference: body.reference,
        receivedAmount: body.receivedAmount,
        parcelCount: body.lines.length,
      },
    });
    return requireRemittanceDetail(remittanceId);
  },

  async listRemittances({ partnerId, cursor, limit }: ListCodRemittancesQuery): Promise<{
    items: CodRemittanceSummaryView[];
    nextCursor: string | null;
  }> {
    const remittances = await logisticsCodRepository.listRemittances({
      ...(partnerId ? { partnerId } : {}),
      ...(cursor ? { cursor } : {}),
      limit,
    });
    const { items, nextCursor } = buildCursorPage(remittances, limit, ({ id }) => id);
    return { items: items.map(toCodRemittanceSummaryView), nextCursor };
  },

  getRemittance: requireRemittanceDetail,
};
