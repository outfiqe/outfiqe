import { Shirt } from "lucide-react";

import type { BrandOrderItem } from "../api/brandOrdersSchemas";

const PAYMENT_STATUS_LABEL: Record<BrandOrderItem["paymentStatus"], string> = {
  INITIATED: "Payment pending",
  PAID: "Paid",
  DUE: "Cash on delivery",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
};

const PAYMENT_STATUS_CLASS: Record<BrandOrderItem["paymentStatus"], string> = {
  INITIATED: "bg-muted text-foreground",
  PAID: "bg-primary/10 text-primary-strong",
  DUE: "bg-muted text-foreground",
  FAILED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-destructive/10 text-destructive",
};

const FULFILMENT_STATUS_CLASS: Record<BrandOrderItem["fulfilmentStatus"], string> = {
  PLACED: "bg-muted text-foreground",
  PACKED: "bg-muted text-foreground",
  SHIPPED: "bg-muted text-foreground",
  DELIVERED: "bg-primary/10 text-primary-strong",
  CANCELLED: "bg-destructive/10 text-destructive",
};

type BrandOrderRowProps = {
  item: BrandOrderItem;
};

export const BrandOrderRow = ({ item }: BrandOrderRowProps) => {
  const {
    productName,
    imageUrl,
    sizeLabel,
    qty,
    unitPrice,
    orderId,
    orderCreatedAt,
    paymentStatus,
    fulfilmentStatus,
  } = item;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border p-4">
      <div
        className="flex aspect-3/4 w-14 shrink-0 items-center justify-center rounded-lg bg-muted bg-cover bg-center"
        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}
      >
        {!imageUrl && <Shirt className="size-6 text-foreground/25" strokeWidth={1} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{productName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {sizeLabel} · Qty {qty} · Rs. {unitPrice.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Order {orderId} · {new Date(orderCreatedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STATUS_CLASS[paymentStatus]}`}
        >
          {PAYMENT_STATUS_LABEL[paymentStatus]}
        </span>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${FULFILMENT_STATUS_CLASS[fulfilmentStatus]}`}
        >
          {fulfilmentStatus}
        </span>
      </div>
    </div>
  );
};
