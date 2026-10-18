import { addMilliseconds } from "date-fns/addMilliseconds";

import {
  type ContractorRiderPay,
  COUNTRY_SETTINGS,
  PLATFORM_DEFAULT_COUNTRY_SETTINGS,
} from "#constants/country.constants.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { RETURN_WINDOW_MS } from "#constants/settlement.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  RiderEarningKind,
  RiderEarningStatus,
  RiderEmploymentType,
  RiderTaskStatus,
} from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import type { DbClient } from "#types/db.types.js";

import { logisticsRiderRepository } from "../riders/rider.repository.js";
import { logisticsRiderPayRepository, type TaskToPay } from "./rider-pay.repository.js";
import type {
  CreateRiderPayRateBody,
  ListMyRiderEarningsQuery,
  ListRiderEarningsQuery,
} from "./rider-pay.schemas.js";
import type {
  RiderEarningsSummaryView,
  RiderEarningView,
  RiderPayRatesView,
  RiderPayRateView,
} from "./rider-pay.types.js";
import {
  calculateVisitEarning,
  toRiderEarningView,
  toRiderPayRateView,
} from "./rider-pay.utils.js";

const NO_STOPS = 0;
const NO_AMOUNT = 0;
const NO_EARNINGS_RELEASED = 0;
const RIDER_PAY_RATE_AUDIT_TARGET_TYPE = "RiderPayRate";
const RIDER_EARNING_AUDIT_TARGET_TYPE = "RiderEarning";

type TransactionClient = Prisma.TransactionClient;
type PayInEffect = ContractorRiderPay & {
  payRateId: string | null;
  currency: string;
  isDefault: boolean;
};

const EARNING_KIND_BY_TASK_STATUS: Partial<Record<RiderTaskStatus, RiderEarningKind>> = {
  [RiderTaskStatus.COMPLETED]: RiderEarningKind.VISIT,
  [RiderTaskStatus.WASTED]: RiderEarningKind.WASTED_VISIT,
};

const settingsForCountry = (countryCode: string) =>
  COUNTRY_SETTINGS[countryCode] ?? PLATFORM_DEFAULT_COUNTRY_SETTINGS;

const resolvePayInEffect = async (
  client: DbClient,
  countryCode: string,
  at: Date,
): Promise<PayInEffect> => {
  const rate = await logisticsRiderPayRepository.findRateInEffect(client, {
    countryCode,
    employmentType: RiderEmploymentType.CONTRACTOR,
    at,
  });
  if (rate) {
    const { id, currency, visitAmount, extraStopAmount, wastedVisitAmount } = rate;
    return {
      payRateId: id,
      currency,
      visitAmount,
      extraStopAmount,
      wastedVisitAmount,
      isDefault: false,
    };
  }
  const { currency, contractorRiderPay } = settingsForCountry(countryCode);
  return { payRateId: null, currency, ...contractorRiderPay, isDefault: true };
};

const countStopsPaidFor = async (
  tx: TransactionClient,
  task: TaskToPay,
  kind: RiderEarningKind,
): Promise<number> =>
  kind === RiderEarningKind.VISIT
    ? logisticsRiderPayRepository.countScannedStops(tx, task.id)
    : NO_STOPS;

const requireRiderProfile = async (userId: string) => {
  const rider = await logisticsRiderRepository.findRiderByUserId(userId);
  if (!rider) {
    throw new AppError(
      "RIDER_NOT_FOUND",
      "No rider profile for this account.",
      HTTP_STATUS.FORBIDDEN,
    );
  }
  return rider;
};

const requireSupportedCountry = (countryCode: string) => {
  const countrySettings = COUNTRY_SETTINGS[countryCode];
  if (!countrySettings) {
    throw new AppError(
      "COUNTRY_NOT_SUPPORTED",
      "Outfiqe doesn't run deliveries in this country yet.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }
  return countrySettings;
};

const toEarningsSummary = (
  currency: string,
  sums: Partial<Record<RiderEarningStatus, number>>,
): RiderEarningsSummaryView => ({
  currency,
  pendingAmount: sums[RiderEarningStatus.PENDING] ?? NO_AMOUNT,
  availableAmount: sums[RiderEarningStatus.AVAILABLE] ?? NO_AMOUNT,
  withdrawnAmount: sums[RiderEarningStatus.WITHDRAWN] ?? NO_AMOUNT,
});

const earningNotFoundError = () =>
  new AppError("RIDER_EARNING_NOT_FOUND", "Earning not found.", HTTP_STATUS.NOT_FOUND);

export const logisticsRiderPayService = {
  async recordVisitEarning(tx: TransactionClient, taskId: string): Promise<void> {
    const task = await logisticsRiderPayRepository.findTaskToPay(tx, taskId);
    if (task?.rider.employmentType !== RiderEmploymentType.CONTRACTOR) return;
    const kind = EARNING_KIND_BY_TASK_STATUS[task.status];
    if (!kind) return;

    const stopCount = await countStopsPaidFor(tx, task, kind);
    if (kind === RiderEarningKind.VISIT && stopCount === NO_STOPS) return;

    const earnedAt = task.completedAt ?? new Date();
    const { payRateId, currency, isDefault, ...pay } = await resolvePayInEffect(
      tx,
      task.hub.countryCode,
      earnedAt,
    );
    if (isDefault) {
      logger.warn(
        `No rider pay rate is set for ${task.hub.countryCode}; visit ${taskId} was paid at the default rate.`,
      );
    }
    await logisticsRiderPayRepository.insertEarning(tx, {
      riderId: task.riderId,
      riderTaskId: task.id,
      payRateId,
      kind,
      currency,
      stopCount,
      ...pay,
      amount: calculateVisitEarning({ kind, stopCount }, pay),
      earnedAt,
      releasesAt: addMilliseconds(earnedAt, RETURN_WINDOW_MS),
    });
  },

  async releaseDueRiderEarnings(): Promise<void> {
    const releasedCount = await logisticsRiderPayRepository.releaseDueEarnings(new Date());
    if (releasedCount > NO_EARNINGS_RELEASED) {
      logger.info(`Released ${releasedCount} rider earnings for withdrawal.`);
    }
  },

  async getRiderPayRates(countryCode: string): Promise<RiderPayRatesView> {
    const { currency } = settingsForCountry(countryCode);
    const [{ visitAmount, extraStopAmount, wastedVisitAmount, isDefault }, rates] =
      await Promise.all([
        resolvePayInEffect(prisma, countryCode, new Date()),
        logisticsRiderPayRepository.listRates(countryCode),
      ]);
    return {
      countryCode,
      currency,
      rateInEffect: { visitAmount, extraStopAmount, wastedVisitAmount, isDefault },
      rates: rates.map(toRiderPayRateView),
    };
  },

  async createRiderPayRate(
    staffUserId: string,
    { countryCode, effectiveFrom, ...amounts }: CreateRiderPayRateBody,
  ): Promise<RiderPayRateView> {
    const { currency } = requireSupportedCountry(countryCode);
    const rate = await logisticsRiderPayRepository.createRate({
      countryCode,
      currency,
      employmentType: RiderEmploymentType.CONTRACTOR,
      ...amounts,
      effectiveFrom: effectiveFrom ?? new Date(),
      createdById: staffUserId,
    });
    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.RIDER_PAY_RATE_CREATED,
      summary: `Set contractor rider pay for ${countryCode}`,
      targetType: RIDER_PAY_RATE_AUDIT_TARGET_TYPE,
      targetId: rate.id,
      metadata: { countryCode, ...amounts, effectiveFrom: rate.effectiveFrom.toISOString() },
    });
    return toRiderPayRateView(rate);
  },

  async deactivateRiderPayRate(staffUserId: string, rateId: string): Promise<RiderPayRateView> {
    if (!(await logisticsRiderPayRepository.findRate(rateId))) {
      throw new AppError("RIDER_PAY_RATE_NOT_FOUND", "Pay rate not found.", HTTP_STATUS.NOT_FOUND);
    }
    const rate = await logisticsRiderPayRepository.deactivateRate(rateId);
    if (!rate) {
      throw new AppError(
        "RIDER_PAY_RATE_ALREADY_OFF",
        "This pay rate is already switched off.",
        HTTP_STATUS.CONFLICT,
      );
    }
    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.RIDER_PAY_RATE_DEACTIVATED,
      summary: `Switched off a contractor rider pay rate for ${rate.countryCode}`,
      targetType: RIDER_PAY_RATE_AUDIT_TARGET_TYPE,
      targetId: rate.id,
    });
    return toRiderPayRateView(rate);
  },

  async listMyRiderEarnings(
    userId: string,
    { cursor, limit }: ListMyRiderEarningsQuery,
  ): Promise<{
    summary: RiderEarningsSummaryView;
    items: RiderEarningView[];
    nextCursor: string | null;
  }> {
    const rider = await requireRiderProfile(userId);
    const [sums, earnings, hubCountryCode] = await Promise.all([
      logisticsRiderPayRepository.sumEarningsByStatus(rider.id),
      logisticsRiderPayRepository.listEarnings({
        riderId: rider.id,
        ...(cursor ? { cursor } : {}),
        limit,
      }),
      logisticsRiderPayRepository.findHubCountryCode(rider.hubId),
    ]);
    const { items, nextCursor } = buildCursorPage(earnings, limit, ({ id }) => id);
    return {
      summary: toEarningsSummary(settingsForCountry(hubCountryCode).currency, sums),
      items: items.map(toRiderEarningView),
      nextCursor,
    };
  },

  async listRiderEarnings({
    riderId,
    status,
    cursor,
    limit,
  }: ListRiderEarningsQuery): Promise<{ items: RiderEarningView[]; nextCursor: string | null }> {
    const earnings = await logisticsRiderPayRepository.listEarnings({
      ...(riderId ? { riderId } : {}),
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
      limit,
    });
    const { items, nextCursor } = buildCursorPage(earnings, limit, ({ id }) => id);
    return { items: items.map(toRiderEarningView), nextCursor };
  },

  async voidRiderEarning(
    staffUserId: string,
    earningId: string,
    reason: string,
  ): Promise<RiderEarningView> {
    if (!(await logisticsRiderPayRepository.findEarning(earningId))) throw earningNotFoundError();
    const isVoided = await logisticsRiderPayRepository.voidEarning(earningId, {
      voidedById: staffUserId,
      voidReason: reason,
    });
    if (!isVoided) {
      throw new AppError(
        "RIDER_EARNING_NOT_VOIDABLE",
        "This earning was already withdrawn or voided.",
        HTTP_STATUS.CONFLICT,
      );
    }
    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.RIDER_EARNING_VOIDED,
      summary: `Voided rider earning ${earningId}`,
      targetType: RIDER_EARNING_AUDIT_TARGET_TYPE,
      targetId: earningId,
      metadata: { reason },
    });
    const voidedEarning = await logisticsRiderPayRepository.findEarning(earningId);
    if (!voidedEarning) throw earningNotFoundError();
    return toRiderEarningView(voidedEarning);
  },
};
