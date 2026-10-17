import type { UnavailableRequestRecord } from "./unavailable-item.repository.js";
import type { UnavailableItemRequestView } from "./unavailable-item.types.js";

export const toUnavailableItemRequestView = (
  request: UnavailableRequestRecord,
): UnavailableItemRequestView => ({
  id: request.id,
  orderId: request.orderItem.orderId,
  fulfilmentGroupId: request.fulfilmentGroupId,
  orderItemId: request.orderItemId,
  brandName: request.brand.name,
  productName: request.orderItem.product.name,
  sizeLabel: request.orderItem.size.label,
  unitPrice: request.orderItem.unitPrice,
  qty: request.qty,
  reason: request.reason,
  status: request.status,
  decisionNote: request.decisionNote,
  refundId: request.refundId,
  createdAt: request.createdAt.toISOString(),
  decidedAt: request.decidedAt?.toISOString() ?? null,
});
