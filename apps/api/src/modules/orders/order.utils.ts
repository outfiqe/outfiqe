import {
  type BrandPayoutStatus,
  FulfilmentStatus,
  OrderFulfilmentSummary,
  type PaymentStatus,
} from "#generated/prisma/enums.js";

import type {
  BrandFulfilmentGroupDetailView,
  BrandFulfilmentGroupItemView,
  BrandFulfilmentGroupPayoutView,
  BrandFulfilmentGroupSummaryView,
  BrandOrderItemView,
  OrderAdminSummaryView,
  OrderAdminView,
  OrderFulfilmentRollup,
  OrderItemView,
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
};

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

  const activeGroupStatuses = groupStatuses.filter(
    (status) => status !== FulfilmentStatus.CANCELLED,
  );
  if (activeGroupStatuses.length === 0) {
    return {
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
  subtotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  brandDiscountTotal: number;
  platformDiscountTotal: number;
  items: OrderItemRow[];
  transactions?: PaymentTransactionRow[];
};

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
    subtotal,
    deliveryFee,
    codFee,
    total,
    brandDiscountTotal,
    platformDiscountTotal,
    items: items.map(toOrderItemView),
    transactions: (transactions ?? []).map(toPaymentTransactionView),
  };
};

export const toOrderSummaryView = (order: OrderRow): OrderSummaryView => {
  const { items, ...rest } = toOrderView(order);
  const [firstItem] = items;

  return {
    ...rest,
    itemCount: order.items.length,
    firstItemImageUrl: firstItem?.imageUrl ?? null,
    firstItemProductName: firstItem?.productName ?? "",
  };
};

type OrderAdminRow = OrderRow & {
  needsManualRefund: boolean;
  user: { name: string; email: string };
};

export const toOrderAdminView = (order: OrderAdminRow): OrderAdminView => {
  const { needsManualRefund, user } = order;
  return {
    ...toOrderView(order),
    needsManualRefund,
    buyerName: user.name,
    buyerEmail: user.email,
  };
};

export const toOrderAdminSummaryView = (order: OrderAdminRow): OrderAdminSummaryView => {
  const { items, ...rest } = toOrderAdminView(order);
  const [firstItem] = items;

  return {
    ...rest,
    itemCount: order.items.length,
    firstItemImageUrl: firstItem?.imageUrl ?? null,
    firstItemProductName: firstItem?.productName ?? "",
  };
};

type BrandOrderItemRow = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  product: { name: string; imageUrl: string | null };
  size: { label: string };
  order: {
    id: string;
    createdAt: Date;
    paymentStatus: OrderView["paymentStatus"];
    fulfilmentStatus: OrderView["fulfilmentStatus"];
  };
};

export const toBrandOrderItemView = (row: BrandOrderItemRow): BrandOrderItemView => {
  const { id, productId, qty, unitPrice, product, size, order } = row;

  return {
    id,
    productId,
    productName: product.name,
    imageUrl: product.imageUrl,
    sizeLabel: size.label,
    qty,
    unitPrice,
    orderId: order.id,
    orderCreatedAt: order.createdAt.toISOString(),
    paymentStatus: order.paymentStatus,
    fulfilmentStatus: order.fulfilmentStatus,
  };
};

type BrandFulfilmentGroupSummaryRow = {
  id: string;
  orderId: string;
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancellationRequestedAt: Date | null;
  items: { qty: number; product: { name: string; imageUrl: string | null } }[];
  order: {
    createdAt: Date;
    city: string;
    paymentStatus: PaymentStatus;
    fulfilmentSummary: OrderFulfilmentSummary;
  };
};

export const toBrandFulfilmentGroupSummaryView = (
  row: BrandFulfilmentGroupSummaryRow,
): BrandFulfilmentGroupSummaryView => {
  const [firstItem] = row.items;

  return {
    id: row.id,
    orderId: row.orderId,
    orderCreatedAt: row.order.createdAt.toISOString(),
    status: row.status,
    carrier: row.carrier,
    trackingNumber: row.trackingNumber,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    cancellationRequestedAt: row.cancellationRequestedAt?.toISOString() ?? null,
    itemCount: row.items.length,
    totalQty: row.items.reduce((sum, item) => sum + item.qty, 0),
    firstItemImageUrl: firstItem?.product.imageUrl ?? null,
    firstItemProductName: firstItem?.product.name ?? "",
    shipToCity: row.order.city,
    orderPaymentStatus: row.order.paymentStatus,
    orderFulfilmentSummary: row.order.fulfilmentSummary,
  };
};

type BrandFulfilmentGroupPayoutRow = {
  orderItemId: string;
  grossAmount: number;
  platformFee: number;
  gatewayFee: number;
  netAmount: number;
  status: BrandPayoutStatus;
};

type BrandFulfilmentGroupDetailRow = {
  id: string;
  orderId: string;
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  packedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancellationRequestedAt: Date | null;
  cancellationReason: string | null;
  items: {
    id: string;
    productId: string;
    qty: number;
    unitPrice: number;
    listUnitPrice: number;
    brandDiscountAmount: number;
    platformDiscountAmount: number;
    product: { name: string; imageUrl: string | null };
    size: { label: string };
    brandPayout: BrandFulfilmentGroupPayoutRow | null;
  }[];
  order: {
    createdAt: Date;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    landmark: string | null;
    paymentStatus: PaymentStatus;
    fulfilmentSummary: OrderFulfilmentSummary;
  };
};

const toBrandFulfilmentGroupItemView = (
  item: BrandFulfilmentGroupDetailRow["items"][number],
): BrandFulfilmentGroupItemView => ({
  id: item.id,
  productId: item.productId,
  productName: item.product.name,
  imageUrl: item.product.imageUrl,
  sizeLabel: item.size.label,
  qty: item.qty,
  unitPrice: item.unitPrice,
  listUnitPrice: item.listUnitPrice,
  brandDiscountAmount: item.brandDiscountAmount,
  platformDiscountAmount: item.platformDiscountAmount,
});

const toBrandFulfilmentGroupPayoutView = (
  items: BrandFulfilmentGroupDetailRow["items"],
): BrandFulfilmentGroupPayoutView => {
  const lines = items
    .map((item) => item.brandPayout)
    .filter((payout): payout is BrandFulfilmentGroupPayoutRow => payout !== null)
    .map((payout) => ({
      orderItemId: payout.orderItemId,
      grossAmount: payout.grossAmount,
      platformFee: payout.platformFee,
      gatewayFee: payout.gatewayFee,
      netAmount: payout.netAmount,
      status: payout.status,
    }));

  return {
    lines,
    grossAmount: lines.reduce((sum, line) => sum + line.grossAmount, 0),
    platformFee: lines.reduce((sum, line) => sum + line.platformFee, 0),
    gatewayFee: lines.reduce((sum, line) => sum + line.gatewayFee, 0),
    netAmount: lines.reduce((sum, line) => sum + line.netAmount, 0),
  };
};

export const toBrandFulfilmentGroupDetailView = (
  row: BrandFulfilmentGroupDetailRow,
): BrandFulfilmentGroupDetailView => ({
  id: row.id,
  orderId: row.orderId,
  orderCreatedAt: row.order.createdAt.toISOString(),
  status: row.status,
  carrier: row.carrier,
  trackingNumber: row.trackingNumber,
  packedAt: row.packedAt?.toISOString() ?? null,
  shippedAt: row.shippedAt?.toISOString() ?? null,
  deliveredAt: row.deliveredAt?.toISOString() ?? null,
  cancellationRequestedAt: row.cancellationRequestedAt?.toISOString() ?? null,
  cancellationReason: row.cancellationReason,
  items: row.items.map(toBrandFulfilmentGroupItemView),
  shipTo: {
    fullName: row.order.fullName,
    phone: row.order.phone,
    address: row.order.address,
    city: row.order.city,
    landmark: row.order.landmark,
  },
  payout: toBrandFulfilmentGroupPayoutView(row.items),
  shipToCity: row.order.city,
  orderPaymentStatus: row.order.paymentStatus,
  orderFulfilmentSummary: row.order.fulfilmentSummary,
});
