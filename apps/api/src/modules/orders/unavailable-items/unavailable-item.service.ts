import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandIncidentKind,
  BrandUnavailableRequestStatus,
  OrderRefundCause,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandIncidentRepository } from "#modules/logistics/reliability/brand-incident.repository.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { ORDER_AUDIT_TARGET_TYPE } from "../order.constants.js";
import { orderErrors } from "../order.errors.js";
import { orderItemChangeAccess } from "../refunds/item-change-access.js";
import { isGroupStillWithBrand } from "../refunds/line-cancellation.utils.js";
import { orderRefundEngine } from "../refunds/refund.engine.js";
import { orderUnavailableItemRepository } from "./unavailable-item.repository.js";
import type {
  ListUnavailableItemsQuery,
  RejectUnavailableItemBody,
  ReportUnavailableItemsBody,
} from "./unavailable-item.schemas.js";
import type { UnavailableItemRequestView } from "./unavailable-item.types.js";
import { toUnavailableItemRequestView } from "./unavailable-item.utils.js";

const groupNotFoundError = () => orderErrors.notFound();

const requestNotFoundError = () =>
  new AppError("UNAVAILABLE_REQUEST_NOT_FOUND", "Request not found.", HTTP_STATUS.NOT_FOUND);

const requestAlreadyDecidedError = () =>
  new AppError(
    "UNAVAILABLE_REQUEST_ALREADY_DECIDED",
    "Someone has already dealt with this request.",
    HTTP_STATUS.CONFLICT,
  );

const requireBrandGroup = async (groupId: string, brandId: string) => {
  const group = await orderUnavailableItemRepository.findBrandGroupWithItems(groupId, brandId);
  if (!group) throw groupNotFoundError();
  return group;
};

const requireRequest = async (requestId: string) => {
  const request = await orderUnavailableItemRepository.findRequest(prisma, requestId);
  if (!request) throw requestNotFoundError();
  return request;
};

const listUnavailableItemsForMyGroup = async (
  userId: string,
  groupId: string,
): Promise<UnavailableItemRequestView[]> => {
  const brandId = await requireBrandId(userId);
  await requireBrandGroup(groupId, brandId);
  const requests = await orderUnavailableItemRepository.listForGroup(groupId);
  return requests.map(toUnavailableItemRequestView);
};

export const orderUnavailableItemService = {
  async reportUnavailableItems(
    userId: string,
    groupId: string,
    { lines, reason }: ReportUnavailableItemsBody,
  ): Promise<UnavailableItemRequestView[]> {
    const brandId = await requireBrandId(userId);
    const group = await requireBrandGroup(groupId, brandId);
    if (!(await orderItemChangeAccess.isBrandAllowingItemChanges(brandId))) {
      throw new AppError(
        "UNAVAILABLE_REPORTS_NOT_AVAILABLE",
        "Reporting single items isn't available for your brand yet. Use Request cancellation instead.",
        HTTP_STATUS.CONFLICT,
      );
    }
    if (!isGroupStillWithBrand(group)) {
      throw new AppError(
        "ITEM_ALREADY_ON_ITS_WAY",
        "This order has already left your hands, so items can't be reported as unavailable.",
        HTTP_STATUS.CONFLICT,
      );
    }
    const itemsById = new Map(group.items.map((item) => [item.id, item]));
    const hasInvalidLine = lines.some(({ orderItemId, qty }) => {
      const item = itemsById.get(orderItemId);
      return !item || qty > item.qty - item.refundedQty;
    });
    if (hasInvalidLine) {
      throw new AppError(
        "UNAVAILABLE_MORE_THAN_ORDERED",
        "Choose items from this order, and no more than were ordered.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    try {
      await orderUnavailableItemRepository.createRequests(
        prisma,
        lines.map(({ orderItemId, qty }) => ({
          fulfilmentGroupId: groupId,
          orderItemId,
          brandId,
          qty,
          reason,
          requestedById: userId,
        })),
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      throw new AppError(
        "UNAVAILABLE_REQUEST_ALREADY_OPEN",
        "One of these items is already waiting for Outfiqe to review.",
        HTTP_STATUS.CONFLICT,
      );
    }
    return listUnavailableItemsForMyGroup(userId, groupId);
  },

  listForMyGroup: listUnavailableItemsForMyGroup,

  async listForStaff(
    query: ListUnavailableItemsQuery,
  ): Promise<{ items: UnavailableItemRequestView[]; nextCursor: string | null }> {
    const requests = await orderUnavailableItemRepository.listForStaff(query);
    const { items, nextCursor } = buildCursorPage(requests, query.limit, (request) => request.id);
    return { items: items.map(toUnavailableItemRequestView), nextCursor };
  },

  async approve(staffUserId: string, requestId: string): Promise<UnavailableItemRequestView> {
    const request = await requireRequest(requestId);
    const { orderId } = request.orderItem;
    const appliedRefund = await prisma.$transaction(async (tx) => {
      const applied = await orderRefundEngine.claimAndApplyInTransaction(
        tx,
        {
          orderId,
          lineRequests: [{ orderItemId: request.orderItemId, qty: request.qty }],
          cause: OrderRefundCause.BRAND_UNAVAILABLE,
          reason: `${request.brand.name} can't supply it: ${request.reason}`,
          requestedById: staffUserId,
        },
        { restockUnits: false, actorUserId: staffUserId },
      );
      const isDecided = await orderUnavailableItemRepository.decideRequest(tx, requestId, {
        status: BrandUnavailableRequestStatus.APPROVED,
        decidedById: staffUserId,
        refundId: applied.claim.refundId,
      });
      if (!isDecided) throw requestAlreadyDecidedError();
      await brandIncidentRepository.recordIncidents(tx, [
        {
          brandId: request.brandId,
          kind: BrandIncidentKind.UNAVAILABLE_ITEM,
          sourceKey: requestId,
          orderId,
          note: request.reason,
          occurredAt: new Date(),
        },
      ]);
      return applied;
    });
    await orderRefundEngine.finishAfterCommit(appliedRefund);

    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.ORDER_ITEMS_REFUNDED,
      summary: `Approved ${request.brand.name}'s unavailable item on order ${orderId}`,
      targetType: ORDER_AUDIT_TARGET_TYPE,
      targetId: orderId,
      metadata: { requestId, refundId: appliedRefund.claim.refundId },
    });
    return toUnavailableItemRequestView(await requireRequest(requestId));
  },

  async reject(
    staffUserId: string,
    requestId: string,
    { note }: RejectUnavailableItemBody,
  ): Promise<UnavailableItemRequestView> {
    const request = await requireRequest(requestId);
    const isDecided = await orderUnavailableItemRepository.decideRequest(prisma, requestId, {
      status: BrandUnavailableRequestStatus.REJECTED,
      decidedById: staffUserId,
      decisionNote: note,
    });
    if (!isDecided) throw requestAlreadyDecidedError();
    return toUnavailableItemRequestView(await requireRequest(request.id));
  },
};
