import type {
  BrandOrderItemView,
  OrderAdminSummaryView,
  OrderAdminView,
  OrderItemView,
  OrderSummaryView,
  OrderView,
  PaymentTransactionView,
} from "./order.types.js";

type OrderItemRow = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
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
  const { id, productId, qty, unitPrice, product, size, attributedCreator } = row;
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
