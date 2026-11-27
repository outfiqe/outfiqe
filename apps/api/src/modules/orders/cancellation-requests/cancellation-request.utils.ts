import type { CancellationRequestRecord } from "./cancellation-request.repository.js";
import type { CancellationRequestView } from "./cancellation-request.types.js";

const NO_AMOUNT = 0;
const EPOCH_START = new Date(0);

export const listRemainingLines = (
  request: CancellationRequestRecord,
): { orderItemId: string; qty: number }[] =>
  request.items.flatMap(({ id, qty, refundedQty }) =>
    qty > refundedQty ? [{ orderItemId: id, qty: qty - refundedQty }] : [],
  );

export const toCancellationRequestView = (
  request: CancellationRequestRecord,
): CancellationRequestView => ({
  fulfilmentGroupId: request.id,
  orderId: request.orderId,
  brandName: request.brand.name,
  groupStatus: request.status,
  reason: request.cancellationReason ?? "",
  requestedAt: (request.cancellationRequestedAt ?? EPOCH_START).toISOString(),
  remainingAmount: request.items.reduce(
    (sum, { unitPrice, qty, refundedQty }) => sum + unitPrice * (qty - refundedQty),
    NO_AMOUNT,
  ),
  items: request.items.map(({ id, qty, refundedQty, unitPrice, product, size }) => ({
    orderItemId: id,
    productName: product.name,
    sizeLabel: size.label,
    unitPrice,
    qty,
    refundedQty,
  })),
});
