import type {
  BrandPayoutStatus,
  CommissionSource,
  FulfilmentStatus,
  OrderFulfilmentSummary,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";

export type OrderFulfilmentRollup = {
  fulfilmentStatus: FulfilmentStatus;
  fulfilmentSummary: OrderFulfilmentSummary;
};

export type CreateOrderItemInput = {
  productId: string;
  sizeId: string;
  qty: number;
  unitPrice: number;
  listUnitPrice: number;
  brandDiscountAmount: number;
  platformDiscountAmount: number;
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
  brandDiscountTotal: number;
  platformDiscountTotal: number;
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
  listUnitPrice: number;
  brandDiscountAmount: number;
  platformDiscountAmount: number;
  attributedCreatorName: string | null;
};

export type OrderShipmentView = {
  id: string;
  brandName: string;
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
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
  fulfilmentSummary: OrderFulfilmentSummary;
  subtotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  brandDiscountTotal: number;
  platformDiscountTotal: number;
  items: OrderItemView[];
  shipments: OrderShipmentView[];
  transactions: PaymentTransactionView[];
};

export type OrderSummaryView = Omit<
  OrderView,
  "items" | "shipments" | "transactions" | "phone" | "address" | "city" | "landmark"
> & {
  itemCount: number;
  firstItemImageUrl: string | null;
  firstItemProductName: string;
};

export type AdminFulfilmentGroupView = {
  id: string;
  brandId: string;
  brandName: string;
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancellationRequestedAt: string | null;
  cancellationReason: string | null;
  itemCount: number;
  productNames: string[];
};

export type OrderAdminView = OrderView & {
  buyerName: string;
  buyerEmail: string;
  needsManualRefund: boolean;
  fulfilmentGroups: AdminFulfilmentGroupView[];
};

export type OrderAdminSummaryView = Omit<
  OrderAdminView,
  "items" | "shipments" | "transactions" | "fulfilmentGroups"
> & {
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

export type BrandFulfilmentGroupItemView = {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  sizeLabel: string;
  qty: number;
  unitPrice: number;
  listUnitPrice: number;
  brandDiscountAmount: number;
  platformDiscountAmount: number;
};

export type BrandFulfilmentGroupPayoutLine = {
  orderItemId: string;
  grossAmount: number;
  platformFee: number;
  gatewayFee: number;
  netAmount: number;
  status: BrandPayoutStatus;
};

export type BrandFulfilmentGroupPayoutView = {
  lines: BrandFulfilmentGroupPayoutLine[];
  grossAmount: number;
  platformFee: number;
  gatewayFee: number;
  netAmount: number;
};

export type BrandFulfilmentGroupSummaryView = {
  id: string;
  orderId: string;
  orderCreatedAt: string;
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancellationRequestedAt: string | null;
  itemCount: number;
  totalQty: number;
  firstItemImageUrl: string | null;
  firstItemProductName: string;
  shipToCity: string;
  orderPaymentStatus: PaymentStatus;
  orderFulfilmentSummary: OrderFulfilmentSummary;
};

export type BrandFulfilmentGroupDetailView = Omit<
  BrandFulfilmentGroupSummaryView,
  "itemCount" | "totalQty" | "firstItemImageUrl" | "firstItemProductName"
> & {
  packedAt: string | null;
  cancellationReason: string | null;
  items: BrandFulfilmentGroupItemView[];
  shipTo: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    landmark: string | null;
  };
  payout: BrandFulfilmentGroupPayoutView;
};
