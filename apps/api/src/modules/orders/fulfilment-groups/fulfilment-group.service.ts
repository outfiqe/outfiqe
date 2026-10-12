import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { FULFILMENT_ADVANCE_FROM } from "../order.constants.js";
import type {
  AdvanceBrandFulfilmentGroupBody,
  ListBrandFulfilmentGroupsQuery,
} from "../order.schemas.js";
import type {
  BrandFulfilmentGroupDetailView,
  BrandFulfilmentGroupSummaryView,
} from "../order.types.js";
import { deriveOrderFulfilment } from "../order.utils.js";
import { orderFulfilmentGroupRepository } from "./fulfilment-group.repository.js";
import {
  toBrandFulfilmentGroupDetailView,
  toBrandFulfilmentGroupSummaryView,
} from "./fulfilment-group.utils.js";

export const orderFulfilmentGroupService = {
  async listBrandFulfilmentGroups(
    userId: string,
    { status, cursor, limit }: ListBrandFulfilmentGroupsQuery,
  ): Promise<{ items: BrandFulfilmentGroupSummaryView[]; nextCursor: string | null }> {
    const brandId = await requireBrandId(userId);
    const rows = await orderFulfilmentGroupRepository.listFulfilmentGroupsForBrand(brandId, {
      status,
      cursor,
      limit,
    });

    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return { items: pagedRows.map(toBrandFulfilmentGroupSummaryView), nextCursor };
  },

  async getBrandFulfilmentGroup(
    userId: string,
    groupId: string,
  ): Promise<BrandFulfilmentGroupDetailView> {
    const brandId = await requireBrandId(userId);
    const group = await orderFulfilmentGroupRepository.findFulfilmentGroupForBrand(
      groupId,
      brandId,
    );
    if (!group) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    return toBrandFulfilmentGroupDetailView(group);
  },

  async advanceBrandFulfilmentGroup(
    userId: string,
    groupId: string,
    { status, carrier, trackingNumber }: AdvanceBrandFulfilmentGroupBody,
  ): Promise<BrandFulfilmentGroupDetailView> {
    const brandId = await requireBrandId(userId);
    const existing = await orderFulfilmentGroupRepository.findFulfilmentGroupStatusForBrand(
      groupId,
      brandId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);

    const fromStatuses = FULFILMENT_ADVANCE_FROM[status] ?? [];
    const advanced = await orderFulfilmentGroupRepository.advanceFulfilmentGroup(
      groupId,
      brandId,
      fromStatuses,
      status,
      { carrier, trackingNumber, at: new Date() },
    );
    if (!advanced) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This shipment can't move to that status from where it is.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const rollupStatusBefore = existing.order.fulfilmentStatus;
    let rollupStatusAfter = rollupStatusBefore;
    await prisma.$transaction(async (tx) => {
      const groupStatuses = await orderFulfilmentGroupRepository.listFulfilmentGroupStatuses(
        tx,
        advanced.orderId,
      );
      const rollup = deriveOrderFulfilment(groupStatuses);
      rollupStatusAfter = rollup.fulfilmentStatus;
      await orderFulfilmentGroupRepository.setOrderFulfilmentRollup(tx, advanced.orderId, rollup);
    });

    if (rollupStatusAfter !== rollupStatusBefore) {
      await eventBus.publish(DomainEvents.ORDER_STATUS_CHANGED, {
        orderId: advanced.orderId,
        userId: existing.order.userId,
        status: rollupStatusAfter,
      });
    }

    const updatedGroup = await orderFulfilmentGroupRepository.findFulfilmentGroupForBrand(
      groupId,
      brandId,
    );
    if (!updatedGroup) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    return toBrandFulfilmentGroupDetailView(updatedGroup);
  },

  async requestBrandFulfilmentGroupCancellation(
    userId: string,
    groupId: string,
    reason: string,
  ): Promise<void> {
    const brandId = await requireBrandId(userId);
    const existing = await orderFulfilmentGroupRepository.findFulfilmentGroupStatusForBrand(
      groupId,
      brandId,
    );
    if (!existing) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);

    const flagged = await orderFulfilmentGroupRepository.flagFulfilmentGroupCancellationRequest(
      groupId,
      brandId,
      reason,
      new Date(),
    );
    if (!flagged) {
      throw new AppError(
        "INVALID_STATE",
        "This shipment already has a cancellation request, or is already cancelled.",
        HTTP_STATUS.CONFLICT,
      );
    }

    logger.info(
      `Brand ${brandId} requested cancellation of fulfilment group ${groupId} ` +
        `on order ${existing.order.id}: ${reason}`,
    );
  },
};
