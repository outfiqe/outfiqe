import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { OrderRefundCause } from "#generated/prisma/enums.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { orderItemChangeAccess } from "./item-change-access.js";
import {
  findLineCancellationProblem,
  LINE_CANCELLATION_PROBLEM,
  type LineCancellationProblem,
} from "./line-cancellation.utils.js";
import { orderNotFoundError } from "./refund.claim.js";
import { orderRefundEngine } from "./refund.engine.js";
import { type OrderForRefund, orderRefundRepository } from "./refund.repository.js";
import type { CancelMyOrderLinesBody } from "./refund.schemas.js";
import type { OrderRefundView } from "./refund.types.js";
import { toOrderRefundView } from "./refund.utils.js";

const LINE_CANCELLATION_IDEMPOTENCY_ENDPOINT = "orders:customer-line-cancellation";
const DEFAULT_LINE_CANCELLATION_REASON = "Cancelled by the customer";

const LINE_CANCELLATION_ERRORS: Record<LineCancellationProblem, () => AppError> = {
  [LINE_CANCELLATION_PROBLEM.ITEM_ALREADY_ON_ITS_WAY]: () =>
    new AppError(
      "ITEM_ALREADY_ON_ITS_WAY",
      "Some of these items have already left the brand, so they can't be cancelled.",
      HTTP_STATUS.CONFLICT,
    ),
  [LINE_CANCELLATION_PROBLEM.COUPON_MINIMUM_NOT_MET]: () =>
    new AppError(
      "COUPON_MINIMUM_NOT_MET",
      "Removing these items would take the order below your coupon's minimum spend. Cancel the whole order instead.",
      HTTP_STATUS.CONFLICT,
    ),
};

const itemCancellationNotAvailableError = () =>
  new AppError(
    "ITEM_CANCELLATION_NOT_AVAILABLE",
    "Single items can't be cancelled on this order. You can still cancel the whole order.",
    HTTP_STATUS.CONFLICT,
  );

const assertBrandsAllowItemCancellation = async (
  order: OrderForRefund,
  lines: CancelMyOrderLinesBody["lines"],
): Promise<void> => {
  const requestedItemIds = new Set(lines.map(({ orderItemId }) => orderItemId));
  const requestedBrandIds = order.items
    .filter(({ id }) => requestedItemIds.has(id))
    .flatMap(({ fulfilmentGroup }) => (fulfilmentGroup ? [fulfilmentGroup.brandId] : []));
  const allowedBrandIds =
    await orderItemChangeAccess.listBrandIdsAllowingItemChanges(requestedBrandIds);
  if (!requestedBrandIds.every((brandId) => allowedBrandIds.has(brandId))) {
    throw itemCancellationNotAvailableError();
  }
};

const cancelLinesOnce = async (
  userId: string,
  orderId: string,
  { lines, reason }: CancelMyOrderLinesBody,
): Promise<OrderRefundView> => {
  const order = await orderRefundRepository.findOrderForRefund(prisma, orderId);
  if (!order || order.userId !== userId) throw orderNotFoundError();
  await assertBrandsAllowItemCancellation(order, lines);

  const appliedRefund = await prisma.$transaction((tx) =>
    orderRefundEngine.claimAndApplyInTransaction(
      tx,
      {
        orderId,
        lineRequests: lines,
        cause: OrderRefundCause.CUSTOMER_CANCELLED,
        reason: reason ?? DEFAULT_LINE_CANCELLATION_REASON,
        requestedById: userId,
        checkBeforeClaim: (orderInTransaction, pricing) => {
          const problem = findLineCancellationProblem(orderInTransaction, pricing);
          if (problem) throw LINE_CANCELLATION_ERRORS[problem]();
        },
      },
      { restockUnits: true, actorUserId: userId },
    ),
  );
  await orderRefundEngine.finishAfterCommit(appliedRefund);

  const refund = await orderRefundRepository.findRefundRecord(appliedRefund.claim.refundId);
  if (!refund) throw orderNotFoundError();
  return toOrderRefundView(refund);
};

export const orderLineCancellationService = {
  cancelMyOrderLines(
    userId: string,
    orderId: string,
    body: CancelMyOrderLinesBody,
    idempotencyKey: string,
  ): Promise<OrderRefundView> {
    return withIdempotency(
      userId,
      LINE_CANCELLATION_IDEMPOTENCY_ENDPOINT,
      idempotencyKey,
      () => cancelLinesOnce(userId, orderId, body),
      { orderId, ...body },
    );
  },
};
