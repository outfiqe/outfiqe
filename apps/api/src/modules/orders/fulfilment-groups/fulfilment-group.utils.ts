import type {
  FulfilmentStatus,
  OrderFulfilmentSummary,
  PickupStatus,
} from "#generated/prisma/enums.js";
import { BrandPayoutStatus, FulfilmentMode, type PaymentStatus } from "#generated/prisma/enums.js";

import type {
  BrandFulfilmentGroupDetailView,
  BrandFulfilmentGroupItemView,
  BrandFulfilmentGroupPayoutView,
  BrandFulfilmentGroupSummaryView,
} from "../order.types.js";
import { isGroupStillWithBrand } from "../refunds/line-cancellation.utils.js";

const NO_PAYOUT = 0;

type BrandFulfilmentGroupSummaryRow = {
  id: string;
  orderId: string;
  status: FulfilmentStatus;
  fulfilmentMode: FulfilmentMode;
  pickupStatus: PickupStatus | null;
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
    fulfilmentMode: row.fulfilmentMode,
    pickupStatus: row.pickupStatus,
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
  fulfilmentMode: FulfilmentMode;
  pickupStatus: PickupStatus | null;
  pickupCode: string | null;
  readyForPickupAt: Date | null;
  pickedUpAt: Date | null;
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
    refundedQty: number;
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
  refundedQty: item.refundedQty,
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
  const owedLines = lines.filter(({ status }) => status !== BrandPayoutStatus.VOIDED);

  return {
    lines,
    grossAmount: owedLines.reduce((sum, line) => sum + line.grossAmount, NO_PAYOUT),
    platformFee: owedLines.reduce((sum, line) => sum + line.platformFee, NO_PAYOUT),
    gatewayFee: owedLines.reduce((sum, line) => sum + line.gatewayFee, NO_PAYOUT),
    netAmount: owedLines.reduce((sum, line) => sum + line.netAmount, NO_PAYOUT),
  };
};

const isDeliveredByOutfiqe = ({ fulfilmentMode }: { fulfilmentMode: FulfilmentMode }): boolean =>
  fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS;

export const toBrandFulfilmentGroupDetailView = (
  row: BrandFulfilmentGroupDetailRow,
): BrandFulfilmentGroupDetailView => ({
  id: row.id,
  orderId: row.orderId,
  orderCreatedAt: row.order.createdAt.toISOString(),
  status: row.status,
  fulfilmentMode: row.fulfilmentMode,
  pickupStatus: row.pickupStatus,
  pickupCode: row.pickupCode,
  readyForPickupAt: row.readyForPickupAt?.toISOString() ?? null,
  pickedUpAt: row.pickedUpAt?.toISOString() ?? null,
  carrier: row.carrier,
  trackingNumber: row.trackingNumber,
  packedAt: row.packedAt?.toISOString() ?? null,
  shippedAt: row.shippedAt?.toISOString() ?? null,
  deliveredAt: row.deliveredAt?.toISOString() ?? null,
  cancellationRequestedAt: row.cancellationRequestedAt?.toISOString() ?? null,
  cancellationReason: row.cancellationReason,
  canReportUnavailable: isGroupStillWithBrand(row),
  items: row.items.map(toBrandFulfilmentGroupItemView),
  shipTo: isDeliveredByOutfiqe(row)
    ? null
    : {
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
