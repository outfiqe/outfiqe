import { addDays } from "date-fns/addDays";
import { isAfter } from "date-fns/isAfter";
import { isBefore } from "date-fns/isBefore";
import { subDays } from "date-fns/subDays";
import { subMinutes } from "date-fns/subMinutes";

import {
  COUNTRY_SETTINGS,
  PLATFORM_DEFAULT_COUNTRY_SETTINGS,
} from "#constants/country.constants.js";
import { LogisticsAlertType } from "#generated/prisma/enums.js";
import { utcMidnightToCalendarDate } from "#lib/working-days.utils.js";

import { LOGISTICS_TIME_LIMITS } from "../logistics.constants.js";
import type { AlertToRaise } from "./alert.types.js";
import {
  type GroupForAlert,
  logisticsAlertCandidatesRepository,
  type OrderForPromise,
  type ShipmentForAlert,
} from "./alert-candidates.repository.js";
import {
  addHubWorkingDays,
  calendarDateBefore,
  localCalendarDate,
  nextPartnerCollectionAfter,
} from "./alert-deadlines.utils.js";

const BRAND_NOT_READY_RULES = [
  {
    alertType: LogisticsAlertType.BRAND_NOT_READY,
    workingDays: LOGISTICS_TIME_LIMITS.brandNotReadyWorkingDays,
  },
  {
    alertType: LogisticsAlertType.BRAND_NOT_READY_ESCALATED,
    workingDays: LOGISTICS_TIME_LIMITS.brandNotReadyEscalationWorkingDays,
  },
];

const groupAlert = (
  alertType: LogisticsAlertType,
  { id, orderId, brandId, hubId }: Pick<GroupForAlert, "id" | "orderId" | "brandId" | "hubId">,
  subjectKey = `group:${id}`,
): AlertToRaise => ({
  alertType,
  subjectKey,
  orderId,
  fulfilmentGroupId: id,
  brandId,
  hubId,
});

const shipmentAlert = (
  alertType: LogisticsAlertType,
  { id, orderId, hubId }: ShipmentForAlert,
  subjectKey = `shipment:${id}`,
): AlertToRaise => ({ alertType, subjectKey, orderId, shipmentId: id, hubId });

const orderAlert = (alertType: LogisticsAlertType, { id }: OrderForPromise): AlertToRaise => ({
  alertType,
  subjectKey: `order:${id}`,
  orderId: id,
});

const isDueBy = (deadline: Date | null, now: Date): boolean =>
  deadline !== null && !isAfter(deadline, now);

const promisedCalendarDate = ({ promisedDeliveryBy }: OrderForPromise): string | null =>
  promisedDeliveryBy ? utcMidnightToCalendarDate(promisedDeliveryBy) : null;

const countryTodayFor = ({ countryCode }: OrderForPromise, now: Date): string =>
  localCalendarDate(
    now,
    (COUNTRY_SETTINGS[countryCode] ?? PLATFORM_DEFAULT_COUNTRY_SETTINGS).timeZone,
  );

const raiseBrandNotReadyAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const alertsByRule = await Promise.all(
    BRAND_NOT_READY_RULES.map(async ({ alertType, workingDays }) => {
      const groups = await logisticsAlertCandidatesRepository.listGroupsAwaitingBrand(
        alertType,
        subDays(now, workingDays),
      );
      return groups.flatMap((group) => {
        const { hub, pickupStatusChangedAt } = group;
        if (!hub || !pickupStatusChangedAt) return [];
        const deadline = addHubWorkingDays(pickupStatusChangedAt, workingDays, hub);
        return isDueBy(deadline, now) ? [groupAlert(alertType, group)] : [];
      });
    }),
  );
  return alertsByRule.flat();
};

const raiseMissedRoundAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const stops = await logisticsAlertCandidatesRepository.listMissedRoundStops(
    subMinutes(now, LOGISTICS_TIME_LIMITS.missedRoundGraceMinutes),
  );
  return stops.map(({ riderTaskId, fulfilmentGroup }) =>
    groupAlert(
      LogisticsAlertType.MISSED_ROUND,
      fulfilmentGroup,
      `group:${fulfilmentGroup.id}:round:${riderTaskId}`,
    ),
  );
};

const raiseWaitingAtHubAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const groups = await logisticsAlertCandidatesRepository.listGroupsWaitingAtHub(now);
  return groups.flatMap((group) => {
    const { hub, atHubAt } = group;
    if (!hub || !atHubAt) return [];
    return isDueBy(nextPartnerCollectionAfter(atHubAt, hub), now)
      ? [groupAlert(LogisticsAlertType.WAITING_AT_HUB, group)]
      : [];
  });
};

const raisePartnerNotCollectedAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const parcels = await logisticsAlertCandidatesRepository.listBookedParcelsAtHub(now);
  return parcels.flatMap((parcel) => {
    const [booking] = parcel.bookings;
    if (!booking) return [];
    return isDueBy(nextPartnerCollectionAfter(parcel.statusChangedAt, parcel.hub), now)
      ? [
          shipmentAlert(
            LogisticsAlertType.PARTNER_NOT_COLLECTED,
            parcel,
            `shipment:${parcel.id}:booking:${booking.id}`,
          ),
        ]
      : [];
  });
};

const raiseNoPartnerUpdateAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const { noPartnerUpdateWorkingDays } = LOGISTICS_TIME_LIMITS;
  const parcels = await logisticsAlertCandidatesRepository.listQuietParcels(
    subDays(now, noPartnerUpdateWorkingDays),
  );
  return parcels.flatMap((parcel) =>
    isDueBy(addHubWorkingDays(parcel.lastEventAt, noPartnerUpdateWorkingDays, parcel.hub), now)
      ? [
          shipmentAlert(
            LogisticsAlertType.NO_PARTNER_UPDATE,
            parcel,
            `shipment:${parcel.id}:${parcel.status}:${parcel.lastEventAt.toISOString()}`,
          ),
        ]
      : [],
  );
};

const raiseRemittanceOverdueAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const parcels = await logisticsAlertCandidatesRepository.listUnremittedCashParcels(now);
  return parcels.flatMap((parcel) => {
    const [booking] = parcel.bookings;
    if (!booking || !parcel.deliveredAt) return [];
    const remitBy = addDays(parcel.deliveredAt, booking.partner.codRemittanceDays);
    return isBefore(remitBy, now)
      ? [shipmentAlert(LogisticsAlertType.COD_REMITTANCE_OVERDUE, parcel)]
      : [];
  });
};

const raisePromiseAtRiskAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const { promiseAtRiskDaysBefore } = LOGISTICS_TIME_LIMITS;
  const orders = await logisticsAlertCandidatesRepository.listOrdersWithPromiseNotOutYet(
    addDays(now, promiseAtRiskDaysBefore),
  );
  return orders.flatMap((order) => {
    const promisedDate = promisedCalendarDate(order);
    if (!promisedDate) return [];
    const isAtRisk =
      countryTodayFor(order, now) >= calendarDateBefore(promisedDate, promiseAtRiskDaysBefore);
    return isAtRisk ? [orderAlert(LogisticsAlertType.PROMISE_AT_RISK, order)] : [];
  });
};

const raisePromiseMissedAlerts = async (now: Date): Promise<AlertToRaise[]> => {
  const orders = await logisticsAlertCandidatesRepository.listOrdersNotDeliveredByPromise(now);
  return orders.flatMap((order) => {
    const promisedDate = promisedCalendarDate(order);
    if (!promisedDate) return [];
    return countryTodayFor(order, now) > promisedDate
      ? [orderAlert(LogisticsAlertType.PROMISE_MISSED, order)]
      : [];
  });
};

export const TIME_LIMIT_ALERT_RULES: readonly {
  name: string;
  raise: (now: Date) => Promise<AlertToRaise[]>;
}[] = [
  { name: "brand-not-ready", raise: raiseBrandNotReadyAlerts },
  { name: "missed-round", raise: raiseMissedRoundAlerts },
  { name: "waiting-at-hub", raise: raiseWaitingAtHubAlerts },
  { name: "partner-not-collected", raise: raisePartnerNotCollectedAlerts },
  { name: "no-partner-update", raise: raiseNoPartnerUpdateAlerts },
  { name: "cod-remittance-overdue", raise: raiseRemittanceOverdueAlerts },
  { name: "promise-at-risk", raise: raisePromiseAtRiskAlerts },
  { name: "promise-missed", raise: raisePromiseMissedAlerts },
];
