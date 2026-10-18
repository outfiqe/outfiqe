import { randomUUID } from "node:crypto";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { TrackingEventSource } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { logisticsShipmentRepository } from "./shipment.repository.js";
import type {
  ListOrdersToPackQuery,
  ListShipmentsQuery,
  RecordParcelEventBody,
} from "./shipment.schemas.js";
import type { OrderToPackView, ShipmentDetailView, ShipmentSummaryView } from "./shipment.types.js";
import {
  toOrderToPackView,
  toShipmentDetailView,
  toShipmentSummaryView,
} from "./shipment.utils.js";

const SHIPMENT_AUDIT_TARGET_TYPE = "Shipment";
const ADMIN_PARCEL_EVENT_DEDUPE_PREFIX = "admin-parcel-event";

const requireShipmentDetail = async (shipmentId: string): Promise<ShipmentDetailView> => {
  const shipment = await logisticsShipmentRepository.findShipmentDetail(shipmentId);
  if (!shipment) {
    throw new AppError("PARCEL_NOT_FOUND", "Parcel not found.", HTTP_STATUS.NOT_FOUND);
  }
  return toShipmentDetailView(shipment);
};

export const logisticsShipmentService = {
  async listHubShipments({
    hubId,
    queue,
    cursor,
    limit,
  }: ListShipmentsQuery): Promise<{ items: ShipmentSummaryView[]; nextCursor: string | null }> {
    const shipments = await logisticsShipmentRepository.listShipmentsForHub({
      hubId,
      queue,
      ...(cursor ? { cursor } : {}),
      limit,
    });
    const { items, nextCursor } = buildCursorPage(shipments, limit, (shipment) => shipment.id);
    return { items: items.map(toShipmentSummaryView), nextCursor };
  },

  getShipmentDetail: requireShipmentDetail,

  async listOrdersToPack({
    hubId,
    cursor,
    limit,
  }: ListOrdersToPackQuery): Promise<{ items: OrderToPackView[]; nextCursor: string | null }> {
    const orders = await logisticsShipmentRepository.listOrdersToPack({
      hubId,
      ...(cursor ? { cursor } : {}),
      limit,
    });
    const { items, nextCursor } = buildCursorPage(orders, limit, (order) => order.id);
    return { items: items.map((order) => toOrderToPackView(order, hubId)), nextCursor };
  },

  async recordParcelEvent(
    staffUserId: string,
    shipmentId: string,
    {
      code,
      rawStatus,
      reasonCode,
      occurredAt,
      note,
      isCorrection,
      codCollectedAmount,
    }: RecordParcelEventBody,
  ): Promise<ShipmentDetailView> {
    await requireShipmentDetail(shipmentId);
    const outcome = await logisticsTrackingService.recordEvent({
      subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId },
      code,
      source: TrackingEventSource.ADMIN,
      actorUserId: staffUserId,
      dedupeKey: `${ADMIN_PARCEL_EVENT_DEDUPE_PREFIX}:${randomUUID()}`,
      occurredAt: occurredAt ?? new Date(),
      note,
      isCorrection,
      ...(rawStatus ? { rawStatus } : {}),
      ...(reasonCode ? { reasonCode } : {}),
      ...(codCollectedAmount === undefined ? {} : { codCollectedAmount }),
    });
    await platformAudit.record({
      actorUserId: staffUserId,
      action: isCorrection
        ? PLATFORM_AUDIT_ACTION.LOGISTICS_STATUS_CORRECTED
        : PLATFORM_AUDIT_ACTION.LOGISTICS_PARCEL_UPDATED,
      summary: `Recorded ${code} on parcel ${shipmentId}`,
      targetType: SHIPMENT_AUDIT_TARGET_TYPE,
      targetId: shipmentId,
      metadata: {
        code,
        note,
        isCorrection,
        appliedToStatus: outcome.appliedToStatus,
        ...(codCollectedAmount === undefined ? {} : { codCollectedAmount }),
      },
    });
    return requireShipmentDetail(shipmentId);
  },
};
