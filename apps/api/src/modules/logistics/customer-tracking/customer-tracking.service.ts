import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { TrackingEventCode, TrackingEventSource } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingRepository } from "../tracking/tracking.repository.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { describeOrderTrackingStage } from "../tracking/tracking.stage.js";
import {
  DELIVERY_DISPUTE_DEDUPE_PREFIX,
  DELIVERY_DISPUTE_WINDOW_DAYS,
  MAX_CUSTOMER_TRACKING_EVENTS,
} from "./customer-tracking.constants.js";
import { logisticsCustomerTrackingRepository } from "./customer-tracking.repository.js";
import type { ReportNotReceivedBody } from "./customer-tracking.schemas.js";
import type { CustomerOrderTrackingView, CustomerParcelView } from "./customer-tracking.types.js";
import {
  isReportedNotReceived,
  isWithinDisputeWindow,
  toCustomerParcelView,
  toCustomerTrackingEventView,
} from "./customer-tracking.utils.js";

const orderNotFoundError = () =>
  new AppError("ORDER_NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);

const alreadyReportedError = () =>
  new AppError(
    "DELIVERY_ALREADY_REPORTED",
    "You've already told us about this parcel. Our team is looking into it.",
    HTTP_STATUS.CONFLICT,
  );

export const logisticsCustomerTrackingService = {
  async getCustomerOrderTracking(
    userId: string,
    orderId: string,
  ): Promise<CustomerOrderTrackingView> {
    const order = await logisticsCustomerTrackingRepository.findCustomerOrder(userId, orderId);
    if (!order) throw orderNotFoundError();
    const [groupSnapshots, events] = await Promise.all([
      logisticsTrackingRepository.listOrderGroupSnapshots(prisma, orderId),
      logisticsCustomerTrackingRepository.listCustomerEvents(orderId, MAX_CUSTOMER_TRACKING_EVENTS),
    ]);
    const now = new Date();
    return {
      stage: describeOrderTrackingStage(groupSnapshots),
      parcels: order.shipments.map((parcel) => toCustomerParcelView(parcel, now)),
      events: events.map(toCustomerTrackingEventView),
    };
  },

  async reportNotReceived(
    userId: string,
    orderId: string,
    { shipmentId, details }: ReportNotReceivedBody,
  ): Promise<CustomerParcelView> {
    const parcel = await logisticsCustomerTrackingRepository.findCustomerParcel(
      userId,
      orderId,
      shipmentId,
    );
    if (!parcel) throw orderNotFoundError();
    if (isReportedNotReceived(parcel)) throw alreadyReportedError();
    const now = new Date();
    if (!isWithinDisputeWindow(parcel, now)) {
      throw new AppError(
        "DELIVERY_DISPUTE_CLOSED",
        `You can tell us a delivered parcel didn't arrive within ${DELIVERY_DISPUTE_WINDOW_DAYS} days of delivery. Contact support for help.`,
        HTTP_STATUS.CONFLICT,
      );
    }

    const { wasDuplicate } = await logisticsTrackingService.recordEvent({
      subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId },
      code: TrackingEventCode.DELIVERY_DISPUTED,
      source: TrackingEventSource.SYSTEM,
      actorUserId: userId,
      dedupeKey: `${DELIVERY_DISPUTE_DEDUPE_PREFIX}:${shipmentId}`,
      occurredAt: now,
      note: details,
    });
    if (wasDuplicate) throw alreadyReportedError();
    logger.warn(`Customer reported parcel ${shipmentId} of order ${orderId} as not received`);

    const reportedParcel = await logisticsCustomerTrackingRepository.findCustomerParcel(
      userId,
      orderId,
      shipmentId,
    );
    if (!reportedParcel) throw orderNotFoundError();
    return toCustomerParcelView(reportedParcel, now);
  },
};
