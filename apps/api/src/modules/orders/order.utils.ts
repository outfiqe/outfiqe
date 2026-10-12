import { FulfilmentStatus, OrderFulfilmentSummary } from "#generated/prisma/enums.js";

import type {
  AdminFulfilmentGroupView,
  OrderAdminSummaryView,
  OrderAdminView,
  OrderFulfilmentRollup,
  OrderItemView,
  OrderShipmentView,
  OrderSummaryView,
  OrderView,
  PaymentTransactionView,
} from "./order.types.js";

const FULFILMENT_PROGRESS: Record<FulfilmentStatus, number> = {
  [FulfilmentStatus.PLACED]: 0,
  [FulfilmentStatus.PACKED]: 1,
  [FulfilmentStatus.SHIPPED]: 2,
  [FulfilmentStatus.DELIVERED]: 3,
  [FulfilmentStatus.CANCELLED]: -1,
  [FulfilmentStatus.RETURNED]: -1,
};

const isClosedStatus = (status: FulfilmentStatus): boolean =>
  status === FulfilmentStatus.CANCELLED || status === FulfilmentStatus.RETURNED;

const isShippedOrLater = (status: FulfilmentStatus): boolean =>
  FULFILMENT_PROGRESS[status] >= FULFILMENT_PROGRESS[FulfilmentStatus.SHIPPED];

const resolveFulfilmentSummary = (
  activeGroupStatuses: readonly FulfilmentStatus[],
): OrderFulfilmentSummary => {
  if (activeGroupStatuses.every((status) => status === FulfilmentStatus.DELIVERED)) {
    return OrderFulfilmentSummary.FULFILLED;
  }
  if (activeGroupStatuses.every(isShippedOrLater)) {
    return OrderFulfilmentSummary.SHIPPED;
  }
  if (activeGroupStatuses.some(isShippedOrLater)) {
    return OrderFulfilmentSummary.PARTIALLY_SHIPPED;
  }
  return OrderFulfilmentSummary.UNFULFILLED;
};

export const deriveOrderFulfilment = (
  groupStatuses: readonly FulfilmentStatus[],
): OrderFulfilmentRollup => {
  if (groupStatuses.length === 0) {
    return {
      fulfilmentStatus: FulfilmentStatus.PLACED,
      fulfilmentSummary: OrderFulfilmentSummary.UNFULFILLED,
    };
  }

  const activeGroupStatuses = groupStatuses.filter((status) => !isClosedStatus(status));
  if (activeGroupStatuses.length === 0) {
    const wasAnyGroupReturned = groupStatuses.includes(FulfilmentStatus.RETURNED);
    return wasAnyGroupReturned
      ? {
          fulfilmentStatus: FulfilmentStatus.RETURNED,
          fulfilmentSummary: OrderFulfilmentSummary.RETURNED,
        }
      : {
          fulfilmentStatus: FulfilmentStatus.CANCELLED,
          fulfilmentSummary: OrderFulfilmentSummary.CANCELLED,
        };
  }

  const leastProgressedStatus = activeGroupStatuses.reduce((slowest, status) =>
    FULFILMENT_PROGRESS[status] < FULFILMENT_PROGRESS[slowest] ? status : slowest,
  );

  return {
    fulfilmentStatus: leastProgressedStatus,
    fulfilmentSummary: resolveFulfilmentSummary(activeGroupStatuses),
  };
};

type OrderItemRow = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  listUnitPrice: number;
  brandDiscountAmount: number;
  platformDiscountAmount: number;
  product: { name: string; imageUrl: string | null; brand: { name: string } };
  size: { label: string };
  attributedCreator: { name: string } | null;
};

type OrderShipmentRow = {
  id: string;
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  brand: { name: string };
};

type OrderRow = {
  id: string;
  createdAt: Date;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  paymentMethod: OrderView["paymentMethod"];
  paymentStatus: OrderView["paymentStatus"];
  fulfilmentStatus: OrderView["fulfilmentStatus"];
  fulfilmentSummary: OrderFulfilmentSummary;
  subtotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  brandDiscountTotal: number;
  platformDiscountTotal: number;
  items: OrderItemRow[];
  fulfilmentGroups?: OrderShipmentRow[];
  transactions?: PaymentTransactionRow[];
};

const toOrderShipmentView = (group: OrderShipmentRow): OrderShipmentView => ({
  id: group.id,
  brandName: group.brand.name,
  status: group.status,
  carrier: group.carrier,
  trackingNumber: group.trackingNumber,
  shippedAt: group.shippedAt?.toISOString() ?? null,
  deliveredAt: group.deliveredAt?.toISOString() ?? null,
});

type PaymentTransactionRow = {
  id: string;
  provider: PaymentTransactionView["provider"];
  type: PaymentTransactionView["type"];
  status: PaymentTransactionView["status"];
  transactionRef: string | null;
  createdAt: Date;
};

const toOrderItemView = (row: OrderItemRow): OrderItemView => {
  const {
    id,
    productId,
    qty,
    unitPrice,
    listUnitPrice,
    brandDiscountAmount,
    platformDiscountAmount,
    product,
    size,
    attributedCreator,
  } = row;
  const { name: productName, imageUrl, brand } = product;

  return {
    id,
    productId,
    productName,
    brandName: brand.name,
    imageUrl,
    sizeLabel: size.label,
    qty,
    unitPrice,
    listUnitPrice,
    brandDiscountAmount,
    platformDiscountAmount,
    attributedCreatorName: attributedCreator?.name ?? null,
  };
};

const toPaymentTransactionView = (row: PaymentTransactionRow): PaymentTransactionView => {
  const { id, provider, type, status, transactionRef, createdAt } = row;
  return { id, provider, type, status, transactionRef, createdAt: createdAt.toISOString() };
};

export const toOrderView = (order: OrderRow): OrderView => {
  const {
    id,
    createdAt,
    fullName,
    phone,
    address,
    city,
    landmark,
    paymentMethod,
    paymentStatus,
    fulfilmentStatus,
    subtotal,
    deliveryFee,
    codFee,
    total,
    brandDiscountTotal,
    platformDiscountTotal,
    items,
    fulfilmentGroups,
    transactions,
  } = order;

  return {
    id,
    createdAt: createdAt.toISOString(),
    fullName,
    phone,
    address,
    city,
    landmark,
    paymentMethod,
    paymentStatus,
    fulfilmentStatus,
    fulfilmentSummary: order.fulfilmentSummary,
    subtotal,
    deliveryFee,
    codFee,
    total,
    brandDiscountTotal,
    platformDiscountTotal,
    items: items.map(toOrderItemView),
    shipments: (fulfilmentGroups ?? []).map(toOrderShipmentView),
    transactions: (transactions ?? []).map(toPaymentTransactionView),
  };
};

export const toOrderSummaryView = (order: OrderRow): OrderSummaryView => {
  const { items, shipments: _shipments, ...rest } = toOrderView(order);
  const [firstItem] = items;

  return {
    ...rest,
    itemCount: order.items.length,
    firstItemImageUrl: firstItem?.imageUrl ?? null,
    firstItemProductName: firstItem?.productName ?? "",
  };
};

type AdminFulfilmentGroupRow = {
  id: string;
  brandId: string;
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  packedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancellationRequestedAt: Date | null;
  cancellationReason: string | null;
  brand: { name: string };
  items: { product: { name: string } }[];
};

type OrderAdminRow = OrderRow & {
  needsManualRefund: boolean;
  fulfilmentSummary: OrderFulfilmentSummary;
  user: { name: string; email: string };
  fulfilmentGroups: AdminFulfilmentGroupRow[];
};

const toAdminFulfilmentGroupView = (group: AdminFulfilmentGroupRow): AdminFulfilmentGroupView => ({
  id: group.id,
  brandId: group.brandId,
  brandName: group.brand.name,
  status: group.status,
  carrier: group.carrier,
  trackingNumber: group.trackingNumber,
  packedAt: group.packedAt?.toISOString() ?? null,
  shippedAt: group.shippedAt?.toISOString() ?? null,
  deliveredAt: group.deliveredAt?.toISOString() ?? null,
  cancelledAt: group.cancelledAt?.toISOString() ?? null,
  cancellationRequestedAt: group.cancellationRequestedAt?.toISOString() ?? null,
  cancellationReason: group.cancellationReason,
  itemCount: group.items.length,
  productNames: group.items.map((item) => item.product.name),
});

export const toOrderAdminView = (order: OrderAdminRow): OrderAdminView => {
  const { needsManualRefund, fulfilmentSummary, user, fulfilmentGroups } = order;
  return {
    ...toOrderView(order),
    needsManualRefund,
    buyerName: user.name,
    buyerEmail: user.email,
    fulfilmentSummary,
    fulfilmentGroups: fulfilmentGroups.map(toAdminFulfilmentGroupView),
  };
};

type OrderAdminSummaryRow = OrderRow & {
  needsManualRefund: boolean;
  fulfilmentSummary: OrderFulfilmentSummary;
  user: { name: string; email: string };
};

export const toOrderAdminSummaryView = (order: OrderAdminSummaryRow): OrderAdminSummaryView => {
  const {
    items,
    shipments: _shipments,
    transactions: _transactions,
    ...orderRest
  } = toOrderView(order);
  const [firstItem] = items;

  return {
    ...orderRest,
    needsManualRefund: order.needsManualRefund,
    buyerName: order.user.name,
    buyerEmail: order.user.email,
    fulfilmentSummary: order.fulfilmentSummary,
    itemCount: order.items.length,
    firstItemImageUrl: firstItem?.imageUrl ?? null,
    firstItemProductName: firstItem?.productName ?? "",
  };
};
