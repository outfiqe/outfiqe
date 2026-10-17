"use client";

import { Skeleton } from "@outfiqe/design-system";

import {
  REFUND_CAUSE_LABELS,
  REFUND_METHOD_LABELS,
  REFUND_STATUS_LABELS,
} from "../constants/refundLabels";
import { useOrderRefunds } from "../hooks/useOrderRefunds";

const NO_REFUNDS = 0;
const NO_FEES = 0;

type OrderRefundsSectionProps = { orderId: string };

export const OrderRefundsSection = ({ orderId }: OrderRefundsSectionProps) => {
  const { data: refunds, isPending, isError } = useOrderRefunds(orderId);

  if (isPending) return <Skeleton className="mt-4 h-24 w-full rounded-2xl" />;
  if (isError) {
    return (
      <p className="mt-4 text-sm text-muted-foreground" role="alert">
        We couldn&apos;t load your refunds right now.
      </p>
    );
  }
  if (refunds.length === NO_REFUNDS) return null;

  return (
    <section
      aria-labelledby="order-refunds-heading"
      className="mt-4 rounded-2xl border border-border p-5"
    >
      <h2
        id="order-refunds-heading"
        className="font-display text-base font-extrabold text-foreground"
      >
        Refunds
      </h2>
      <ul className="mt-3 space-y-3">
        {refunds.map(({ id, cause, status, method, totalAmount, feeAmount, lines }) => (
          <li key={id} className="border-t border-border pt-3 text-sm first:border-t-0 first:pt-0">
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-foreground">
                Rs. {totalAmount.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                {method ? REFUND_METHOD_LABELS[method] : REFUND_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{REFUND_CAUSE_LABELS[cause]}</p>
            <ul className="mt-1 text-xs text-muted-foreground">
              {lines.map((line) => (
                <li key={line.orderItemId}>
                  {line.productName} · {line.sizeLabel} × {line.qty}
                </li>
              ))}
              {feeAmount > NO_FEES && <li>Delivery fees · Rs. {feeAmount.toLocaleString()}</li>}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
};
