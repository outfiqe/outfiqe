import { Shirt } from "lucide-react";
import Link from "next/link";

import type { OrderSummary } from "../api/orderSchemas";
import { PaymentStatus } from "../api/orderSchemas";
import { StatusBadge } from "./StatusBadge";

type OrderRowProps = {
  order: OrderSummary;
};

export const OrderRow = ({ order }: OrderRowProps) => {
  const {
    id,
    createdAt,
    paymentMethod,
    paymentStatus,
    fulfilmentStatus,
    total,
    itemCount,
    firstItemImageUrl,
    firstItemProductName,
  } = order;

  return (
    <Link
      href={`/orders/${id}`}
      className="flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors hover:border-foreground"
    >
      <div
        className="flex aspect-3/4 w-14 shrink-0 items-center justify-center rounded-lg bg-muted bg-cover bg-center"
        style={{ backgroundImage: firstItemImageUrl ? `url(${firstItemImageUrl})` : undefined }}
      >
        {!firstItemImageUrl && <Shirt className="size-6 text-foreground/25" strokeWidth={1} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-extrabold uppercase tracking-wide text-foreground">
          {id}
        </p>
        <p className="mt-1 truncate text-sm text-foreground">
          {firstItemProductName}
          {itemCount > 1 ? ` and ${itemCount - 1} more` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()} · {paymentMethod} · Rs.{" "}
          {total.toLocaleString()}
        </p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <StatusBadge
          status={paymentStatus}
          label={paymentStatus === PaymentStatus.DUE ? "COD due" : paymentStatus}
        />
        <StatusBadge status={fulfilmentStatus} />
      </div>
    </Link>
  );
};
