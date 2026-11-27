import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { brandCancellationDecidedTemplate } from "#email-templates/order.templates.js";
import { BrandIncidentKind, OrderRefundCause } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandIncidentRepository } from "#modules/logistics/reliability/brand-incident.repository.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { ORDER_AUDIT_TARGET_TYPE } from "../order.constants.js";
import { orderErrors } from "../order.errors.js";
import { isGroupStillWithBrand } from "../refunds/line-cancellation.utils.js";
import { orderRefundEngine } from "../refunds/refund.engine.js";
import { CANCELLATION_DECISION } from "./cancellation-request.constants.js";
import {
  type CancellationRequestRecord,
  orderCancellationRequestRepository,
} from "./cancellation-request.repository.js";
import type {
  ListCancellationRequestsQuery,
  RejectCancellationRequestBody,
} from "./cancellation-request.schemas.js";
import type {
  CancellationDecisionView,
  CancellationRequestView,
} from "./cancellation-request.types.js";
import { listRemainingLines, toCancellationRequestView } from "./cancellation-request.utils.js";

const requestAlreadyResolvedError = () =>
  new AppError(
    "CANCELLATION_REQUEST_ALREADY_RESOLVED",
    "Someone has already dealt with this request.",
    HTTP_STATUS.CONFLICT,
  );

const shipmentAlreadyLeftBrandError = () =>
  new AppError(
    "SHIPMENT_ALREADY_ON_ITS_WAY",
    "This shipment has already left the brand, so it can't be cancelled from here. Decline the request or handle it as a return.",
    HTTP_STATUS.CONFLICT,
  );

const requirePendingRequest = async (groupId: string): Promise<CancellationRequestRecord> => {
  const request = await orderCancellationRequestRepository.findPending(prisma, groupId);
  if (request) return request;
  const groupExists = await orderCancellationRequestRepository.groupExists(prisma, groupId);
  throw groupExists ? requestAlreadyResolvedError() : orderErrors.notFound();
};

const notifyBrandOfDecision = (
  { orderId, brand }: CancellationRequestRecord,
  decision: { isApproved: boolean; staffNote: string | null },
): void => {
  const { subject, html } = brandCancellationDecidedTemplate({ orderId, ...decision });
  void sendEmail({
    to: brand.email,
    subject,
    body: `${subject}. ${decision.staffNote ?? ""}`.trim(),
    html,
  });
};

export const orderCancellationRequestService = {
  async listPending(
    query: ListCancellationRequestsQuery,
  ): Promise<{ items: CancellationRequestView[]; nextCursor: string | null }> {
    const requests = await orderCancellationRequestRepository.listPending(query);
    const { items, nextCursor } = buildCursorPage(requests, query.limit, (request) => request.id);
    return { items: items.map(toCancellationRequestView), nextCursor };
  },

  async approve(staffUserId: string, groupId: string): Promise<CancellationDecisionView> {
    const request = await requirePendingRequest(groupId);
    if (!isGroupStillWithBrand(request)) throw shipmentAlreadyLeftBrandError();
    const lineRequests = listRemainingLines(request);
    if (lineRequests.length === 0) throw requestAlreadyResolvedError();

    const { orderId, brandId, brand, cancellationReason } = request;
    const appliedRefund = await prisma.$transaction(async (tx) => {
      const isClaimed = await orderCancellationRequestRepository.clearRequest(tx, groupId);
      if (!isClaimed) throw requestAlreadyResolvedError();
      const applied = await orderRefundEngine.claimAndApplyInTransaction(
        tx,
        {
          orderId,
          lineRequests,
          cause: OrderRefundCause.BRAND_UNAVAILABLE,
          reason: `${brand.name} cancelled its shipment: ${cancellationReason ?? ""}`,
          requestedById: staffUserId,
        },
        { restockUnits: false, actorUserId: staffUserId },
      );
      await brandIncidentRepository.recordIncidents(tx, [
        {
          brandId,
          kind: BrandIncidentKind.UNAVAILABLE_ITEM,
          sourceKey: `cancellation-request:${groupId}`,
          orderId,
          note: cancellationReason,
          occurredAt: new Date(),
        },
      ]);
      return applied;
    });
    await orderRefundEngine.finishAfterCommit(appliedRefund);

    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.BRAND_CANCELLATION_APPROVED,
      summary: `Approved ${brand.name}'s cancellation of its shipment on order ${orderId}`,
      targetType: ORDER_AUDIT_TARGET_TYPE,
      targetId: orderId,
      metadata: { fulfilmentGroupId: groupId, refundId: appliedRefund.claim.refundId },
    });
    notifyBrandOfDecision(request, { isApproved: true, staffNote: null });
    return { fulfilmentGroupId: groupId, orderId, decision: CANCELLATION_DECISION.APPROVED };
  },

  async reject(
    staffUserId: string,
    groupId: string,
    { note }: RejectCancellationRequestBody,
  ): Promise<CancellationDecisionView> {
    const request = await requirePendingRequest(groupId);
    const isCleared = await orderCancellationRequestRepository.clearRequest(prisma, groupId);
    if (!isCleared) throw requestAlreadyResolvedError();

    const { orderId, brand } = request;
    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.BRAND_CANCELLATION_REJECTED,
      summary: `Declined ${brand.name}'s cancellation of its shipment on order ${orderId}`,
      targetType: ORDER_AUDIT_TARGET_TYPE,
      targetId: orderId,
      metadata: { fulfilmentGroupId: groupId, note },
    });
    notifyBrandOfDecision(request, { isApproved: false, staffNote: note });
    return { fulfilmentGroupId: groupId, orderId, decision: CANCELLATION_DECISION.REJECTED };
  },
};
