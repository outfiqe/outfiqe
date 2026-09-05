import type {
  CommissionSource,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";

export type CreateOrderItemInput = {
  productId: string;
  sizeId: string;
  qty: number;
  unitPrice: number;
  listUnitPrice: number;
  brandDiscountAmount: number;
  attributedCreatorId?: string;
  attributedCreatorLookId?: string;
  attributedLinkId?: string;
  attributionSource?: CommissionSource;
};

export type CreateOrderInput = {
  userId: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionStatus: PaymentTransactionStatus;
  subtotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  items: CreateOrderItemInput[];
};

export type PaymentTransactionView = {
  id: string;
  provider: PaymentMethod;
  type: "PAYMENT" | "REFUND";
  status: "INITIATED" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  transactionRef: string | null;
  createdAt: string;
};

export type OrderItemView = {
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  imageUrl: string | null;
  sizeLabel: string;
  qty: number;
  unitPrice: number;
  attributedCreatorName: string | null;
};

export type OrderView = {
  id: string;
  createdAt: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  subtotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  items: OrderItemView[];
  transactions: PaymentTransactionView[];
};

export type OrderSummaryView = Omit<
  OrderView,
  "items" | "transactions" | "phone" | "address" | "city" | "landmark"
> & {
  itemCount: number;
  firstItemImageUrl: string | null;
  firstItemProductName: string;
};

export type OrderAdminView = OrderView & {
  buyerName: string;
  buyerEmail: string;
  needsManualRefund: boolean;
};

export type OrderAdminSummaryView = Omit<OrderAdminView, "items" | "transactions"> & {
  itemCount: number;
  firstItemImageUrl: string | null;
  firstItemProductName: string;
};

export type BrandOrderItemView = {
  id: string;
  orderId: string;
  orderCreatedAt: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  sizeLabel: string;
  qty: number;
  unitPrice: number;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
};

export type CancelOrderActor =
  { type: "ADMIN"; adminUserId: string } | { type: "BUYER"; userId: string };
