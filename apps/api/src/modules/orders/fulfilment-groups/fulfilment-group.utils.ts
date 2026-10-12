import type { FulfilmentStatus, OrderFulfilmentSummary } from "#generated/prisma/enums.js";
import { type BrandPayoutStatus, type PaymentStatus } from "#generated/prisma/enums.js";

import type {
  BrandFulfilmentGroupDetailView,
  BrandFulfilmentGroupItemView,
  BrandFulfilmentGroupPayoutView,
  BrandFulfilmentGroupSummaryView,
} from "../order.types.js";

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
