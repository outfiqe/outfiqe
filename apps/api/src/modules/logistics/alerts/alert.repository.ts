import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import {
  FulfilmentMode,
  LogisticsAlertType,
  PickupStatus,
  RiderStopDirection,
  ShipmentStatus,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { SHIPMENT_STATUSES_WITH_PARTNER } from "../logistics.constants.js";
import type { AlertToRaise } from "./alert.types.js";
import {
  CLOSED_GROUP_STATUSES,
  OPEN_RIDER_TASK_STATUSES,
  SETTLED_ORDER_STATUSES,
  SHIPMENT_STATUSES_ON_TIME_FOR_PROMISE,
} from "./alert-candidates.repository.js";

const PAGE_LOOKAHEAD = 1;
const NO_ROWS = 0;
const NOTIFY_BATCH_SIZE = 100;

const alertViewSelect = {
  id: true,
  alertType: true,
  orderId: true,
  fulfilmentGroupId: true,
  shipmentId: true,
  detail: true,
  raisedAt: true,
  resolvedAt: true,
  isAutoResolved: true,
  resolutionNote: true,
  brand: { select: { name: true } },
  hub: { select: { name: true } },
  shipment: { select: { trackingCode: true } },
  resolvedBy: { select: { name: true } },
} satisfies Prisma.LogisticsAlertSelect;

export type LogisticsAlertRecord = Prisma.LogisticsAlertGetPayload<{
  select: typeof alertViewSelect;
}>;

const alertToNotifySelect = {
  id: true,
  alertType: true,
  orderId: true,
  brandId: true,
  shipment: { select: { trackingCode: true } },
  order: { select: { userId: true } },
} satisfies Prisma.LogisticsAlertSelect;

export type AlertToNotify = Prisma.LogisticsAlertGetPayload<{
  select: typeof alertToNotifySelect;
}>;

const openAlertOfType = (alertType: LogisticsAlertType) => ({ alertType, resolvedAt: null });

const autoResolve = async (where: Prisma.LogisticsAlertWhereInput): Promise<number> => {
  const { count } = await prisma.logisticsAlert.updateMany({
    where,
    data: { resolvedAt: new Date(), isAutoResolved: true },
  });
  return count;
};

export const logisticsAlertRepository = {
  async insertAlerts(client: DbClient, alerts: AlertToRaise[]): Promise<number> {
    if (alerts.length === NO_ROWS) return NO_ROWS;
    const { count } = await client.logisticsAlert.createMany({
      data: alerts,
      skipDuplicates: true,
    });
    return count;
  },

  async listAlertsToNotify(): Promise<AlertToNotify[]> {
    return prisma.logisticsAlert.findMany({
      where: { notifiedAt: null, resolvedAt: null },
      orderBy: { raisedAt: "asc" },
      take: NOTIFY_BATCH_SIZE,
      select: alertToNotifySelect,
    });
  },

  async claimNotification(alertId: string): Promise<boolean> {
    const { count } = await prisma.logisticsAlert.updateMany({
      where: { id: alertId, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    return count > NO_ROWS;
  },

  async resolveAlertsThatMovedOn(): Promise<number> {
    const resolvedCounts = await Promise.all([
      autoResolve({
        alertType: {
          in: [LogisticsAlertType.BRAND_NOT_READY, LogisticsAlertType.BRAND_NOT_READY_ESCALATED],
        },
        resolvedAt: null,
        fulfilmentGroup: { pickupStatus: { not: PickupStatus.AWAITING_BRAND } },
      }),
      autoResolve({
        ...openAlertOfType(LogisticsAlertType.MISSED_ROUND),
        fulfilmentGroup: {
          riderTaskStops: {
            none: {
              isActive: true,
              scannedAt: null,
              direction: RiderStopDirection.COLLECT,
              riderTask: { status: { in: OPEN_RIDER_TASK_STATUSES } },
            },
          },
        },
      }),
      autoResolve({
        ...openAlertOfType(LogisticsAlertType.WAITING_AT_HUB),
        fulfilmentGroup: {
          OR: [{ shipmentId: { not: null } }, { pickupStatus: { not: PickupStatus.AT_HUB } }],
        },
      }),
      autoResolve({
        ...openAlertOfType(LogisticsAlertType.PARTNER_NOT_COLLECTED),
        shipment: { status: { not: ShipmentStatus.PACKED } },
      }),
      autoResolve({
        ...openAlertOfType(LogisticsAlertType.COD_REMITTANCE_OVERDUE),
        shipment: { codRemittanceLine: { isNot: null } },
      }),
      autoResolve({
        ...openAlertOfType(LogisticsAlertType.PROMISE_MISSED),
        order: { fulfilmentStatus: { in: SETTLED_ORDER_STATUSES } },
      }),
      autoResolve({
        ...openAlertOfType(LogisticsAlertType.PROMISE_AT_RISK),
        order: {
          OR: [
            { fulfilmentStatus: { in: SETTLED_ORDER_STATUSES } },
            {
              fulfilmentGroups: {
                none: {
                  fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
                  status: { notIn: CLOSED_GROUP_STATUSES },
                  OR: [
                    { shipmentId: null },
                    {
                      shipment: { status: { notIn: SHIPMENT_STATUSES_ON_TIME_FOR_PROMISE } },
                    },
                  ],
                },
              },
            },
          ],
        },
      }),
      prisma.$executeRaw(Prisma.sql`
        UPDATE logistics_alerts AS alert
        SET resolved_at = now(), is_auto_resolved = true
        FROM shipments AS shipment
        WHERE alert.shipment_id = shipment.id
          AND alert.alert_type = ${LogisticsAlertType.NO_PARTNER_UPDATE}::"LogisticsAlertType"
          AND alert.resolved_at IS NULL
          AND (shipment.last_event_at > alert.raised_at
            OR shipment.status::text NOT IN (${Prisma.join(SHIPMENT_STATUSES_WITH_PARTNER)}))
      `),
    ]);
    return resolvedCounts.reduce((total, resolvedCount) => total + resolvedCount, NO_ROWS);
  },

  async listAlerts(params: {
    isOpen: boolean;
    alertType?: LogisticsAlertType;
    cursor?: string;
    limit: number;
  }): Promise<LogisticsAlertRecord[]> {
    return prisma.logisticsAlert.findMany({
      where: {
        resolvedAt: params.isOpen ? null : { not: null },
        ...(params.alertType ? { alertType: params.alertType } : {}),
      },
      orderBy: [{ raisedAt: "desc" }, { id: "desc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: alertViewSelect,
    });
  },

  async countOpenAlertsByType(): Promise<{ alertType: LogisticsAlertType; openCount: number }[]> {
    const groups = await prisma.logisticsAlert.groupBy({
      by: ["alertType"],
      where: { resolvedAt: null },
      _count: { _all: true },
    });
    return groups.map(({ alertType, _count }) => ({ alertType, openCount: _count._all }));
  },

  async findAlert(alertId: string): Promise<LogisticsAlertRecord | null> {
    return prisma.logisticsAlert.findUnique({ where: { id: alertId }, select: alertViewSelect });
  },

  async resolveAlert(
    alertId: string,
    { resolvedById, resolutionNote }: { resolvedById: string; resolutionNote: string },
  ): Promise<boolean> {
    const { count } = await prisma.logisticsAlert.updateMany({
      where: { id: alertId, resolvedAt: null },
      data: { resolvedAt: new Date(), resolvedById, resolutionNote },
    });
    return count > NO_ROWS;
  },
};
