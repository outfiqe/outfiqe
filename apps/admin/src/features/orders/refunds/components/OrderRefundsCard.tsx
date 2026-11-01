import { Skeleton } from "@outfiqe/design-system";
import { formatDateTime } from "@outfiqe/utils";

import {
  REFUND_CAUSE_LABELS,
  REFUND_METHOD_LABELS,
  REFUND_STATUS_LABELS,
} from "../constants/refundLabels";
import { useOrderRefunds } from "../hooks/useOrderRefunds";

const NO_REFUNDS = 0;
const NO_FEES = 0;

type OrderRefundsCardProps = { orderId: string };

export const OrderRefundsCard = ({ orderId }: OrderRefundsCardProps) => {
  const { data: refunds, isPending, isError } = useOrderRefunds(orderId);

  return (
    <section
      aria-labelledby="order-refunds-heading"
      className="mt-4 rounded-xl border border-border bg-card p-4"
    >
      <h2 id="order-refunds-heading" className="font-display text-sm font-bold text-foreground">
        Refunds
      </h2>
      {isPending ? (
        <Skeleton className="mt-2 h-12 w-full" />
      ) : isError ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Couldn&apos;t load refunds.
        </p>
      ) : refunds.length === NO_REFUNDS ? (
        <p className="mt-2 text-sm text-muted-foreground">No refunds on this order.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {refunds.map(
            ({
              id,
              cause,
              reason,
              status,
              method,
              totalAmount,
              feeAmount,
              transferReference,
              createdAt,
              lines,
            }) => (
              <li
                key={id}
                className="border-t border-border pt-3 text-sm first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    Rs. {totalAmount.toLocaleString()} · {REFUND_CAUSE_LABELS[cause]}
                  </span>
                  <span className="text-muted-foreground">
                    {method ? REFUND_METHOD_LABELS[method] : REFUND_STATUS_LABELS[status]}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {formatDateTime(createdAt)} · {reason}
                </p>
                <ul className="mt-1 text-xs text-muted-foreground">
                  {lines.map((line) => (
                    <li key={line.orderItemId}>
                      {line.productName} · {line.sizeLabel} × {line.qty} · Rs.{" "}
                      {line.amount.toLocaleString()}
                    </li>
                  ))}
                  {feeAmount > NO_FEES && <li>Delivery fees · Rs. {feeAmount.toLocaleString()}</li>}
                  {transferReference && <li>Transfer reference: {transferReference}</li>}
                </ul>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
};
