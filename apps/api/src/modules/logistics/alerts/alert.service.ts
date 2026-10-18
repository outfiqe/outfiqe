import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";

import { sendAlertNotifications } from "./alert.notifications.js";
import { type LogisticsAlertRecord, logisticsAlertRepository } from "./alert.repository.js";
import { TIME_LIMIT_ALERT_RULES } from "./alert.rules.js";
import { ALERT_LIST_STATUS, type ListLogisticsAlertsQuery } from "./alert.schemas.js";
import type { LogisticsAlertView, OpenAlertCountView } from "./alert.types.js";

const NO_ALERTS = 0;

const alertNotFoundError = () =>
  new AppError("LOGISTICS_ALERT_NOT_FOUND", "Alert not found.", HTTP_STATUS.NOT_FOUND);

const toLogisticsAlertView = ({
  brand,
  hub,
  shipment,
  resolvedBy,
  raisedAt,
  resolvedAt,
  ...alert
}: LogisticsAlertRecord): LogisticsAlertView => ({
  ...alert,
  trackingCode: shipment?.trackingCode ?? null,
  brandName: brand?.name ?? null,
  hubName: hub?.name ?? null,
  raisedAt: raisedAt.toISOString(),
  resolvedAt: resolvedAt?.toISOString() ?? null,
  resolvedByName: resolvedBy?.name ?? null,
});

const raiseTimeLimitAlerts = async (now: Date): Promise<number> => {
  const raisedCounts = await Promise.all(
    TIME_LIMIT_ALERT_RULES.map(async ({ name, raise }) => {
      try {
        return await logisticsAlertRepository.insertAlerts(prisma, await raise(now));
      } catch (error) {
        logger.error(`Logistics alert rule ${name} failed: ${describeError(error)}`);
        return NO_ALERTS;
      }
    }),
  );
  return raisedCounts.reduce((total, raisedCount) => total + raisedCount, NO_ALERTS);
};

const notifyNewAlerts = async (): Promise<void> => {
  const alertsToNotify = await logisticsAlertRepository.listAlertsToNotify();
  for (const alert of alertsToNotify) {
    const isClaimed = await logisticsAlertRepository.claimNotification(alert.id);
    if (!isClaimed) continue;
    try {
      await sendAlertNotifications(alert);
    } catch (error) {
      logger.error(`Couldn't send notifications for alert ${alert.id}: ${describeError(error)}`);
    }
  }
};

export const logisticsAlertService = {
  async runLogisticsAlertSweep(): Promise<void> {
    const raisedCount = await raiseTimeLimitAlerts(new Date());
    const resolvedCount = await logisticsAlertRepository.resolveAlertsThatMovedOn();
    await notifyNewAlerts();
    if (raisedCount > NO_ALERTS || resolvedCount > NO_ALERTS) {
      logger.info(`Logistics alerts: ${raisedCount} raised, ${resolvedCount} resolved.`);
    }
  },

  async listLogisticsAlerts({
    status,
    alertType,
    cursor,
    limit,
  }: ListLogisticsAlertsQuery): Promise<{
    items: LogisticsAlertView[];
    nextCursor: string | null;
    openCounts: OpenAlertCountView[];
  }> {
    const [alerts, openCounts] = await Promise.all([
      logisticsAlertRepository.listAlerts({
        isOpen: status === ALERT_LIST_STATUS.OPEN,
        ...(alertType ? { alertType } : {}),
        ...(cursor ? { cursor } : {}),
        limit,
      }),
      logisticsAlertRepository.countOpenAlertsByType(),
    ]);
    const { items, nextCursor } = buildCursorPage(alerts, limit, ({ id }) => id);
    return { items: items.map(toLogisticsAlertView), nextCursor, openCounts };
  },

  async resolveLogisticsAlert(
    staffUserId: string,
    alertId: string,
    resolutionNote: string,
  ): Promise<LogisticsAlertView> {
    if (!(await logisticsAlertRepository.findAlert(alertId))) throw alertNotFoundError();
    const isResolved = await logisticsAlertRepository.resolveAlert(alertId, {
      resolvedById: staffUserId,
      resolutionNote,
    });
    if (!isResolved) {
      throw new AppError(
        "LOGISTICS_ALERT_ALREADY_RESOLVED",
        "This alert is already resolved.",
        HTTP_STATUS.CONFLICT,
      );
    }
    const resolvedAlert = await logisticsAlertRepository.findAlert(alertId);
    if (!resolvedAlert) throw alertNotFoundError();
    return toLogisticsAlertView(resolvedAlert);
  },
};
