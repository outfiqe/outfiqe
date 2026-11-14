import { formatRupees } from "@/shared/lib/formatRupees";

import type { OrderItem } from "../api/orderSchemas";

const NO_AMOUNT = 0;
const NOTHING_REFUNDED = 0;

type OrderPriceBreakdownProps = {
  items: OrderItem[];
  subtotal: number;
  couponDiscount: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  isMoneyUntaken: boolean;
};

const BreakdownRow = ({ label, amount }: { label: string; amount: string }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <dt>{label}</dt>
    <dd>{amount}</dd>
  </div>
);

export const OrderPriceBreakdown = ({
  items,
  subtotal,
  couponDiscount,
  deliveryFee,
  codFee,
  total,
  isMoneyUntaken,
}: OrderPriceBreakdownProps) => (
  <div className="mt-2 border-t border-border pt-3">
    <ul aria-label="Items in this order" className="space-y-1.5 text-sm">
      {items.map(({ id, productName, sizeLabel, qty, unitPrice, refundedQty }) => (
        <li key={id} className="flex justify-between gap-3">
          <span className="min-w-0 text-foreground">
            {productName}
            <span className="text-muted-foreground">
              {" "}
              · {sizeLabel} × {qty}
              {refundedQty > NOTHING_REFUNDED &&
                ` (${refundedQty} ${isMoneyUntaken ? "cancelled" : "refunded"})`}
            </span>
          </span>
          <span className="shrink-0 text-foreground">{formatRupees(unitPrice * qty)}</span>
        </li>
      ))}
    </ul>

    <dl className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
      <BreakdownRow label="Subtotal" amount={formatRupees(subtotal)} />
      {couponDiscount > NO_AMOUNT && (
        <BreakdownRow label="Coupon discount" amount={`− ${formatRupees(couponDiscount)}`} />
      )}
      <BreakdownRow
        label="Delivery"
        amount={deliveryFee > NO_AMOUNT ? formatRupees(deliveryFee) : "Free"}
      />
      {codFee > NO_AMOUNT && <BreakdownRow label="COD handling" amount={formatRupees(codFee)} />}
      <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-base font-extrabold text-foreground">
        <dt>Total</dt>
        <dd>{formatRupees(total)}</dd>
      </div>
    </dl>
  </div>
);
