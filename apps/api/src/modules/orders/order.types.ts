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
};

export type OrderSummaryView = Omit<
  OrderView,
  "items" | "phone" | "address" | "city" | "landmark"
> & {
  itemCount: number;
  firstItemImageUrl: string | null;
  firstItemProductName: string;
};
