import { FulfilmentStatus, OrderFulfilmentSummary } from "#generated/prisma/enums.js";

import type {
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
