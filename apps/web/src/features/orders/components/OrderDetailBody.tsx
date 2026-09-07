"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { Ban, Clock } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import { FulfilmentStatus, PaymentMethod, PaymentStatus } from "../api/orderSchemas";
import { useOrder } from "../hooks/useOrder";
import { OrderTracker } from "./OrderTracker";
import { PendingPaymentPanel } from "./PendingPaymentPanel";
import { StatusBadge } from "./StatusBadge";
import { TransactionLedger } from "./TransactionLedger";

type OrderDetailBodyProps = {
  orderId: string;
};

export const OrderDetailBody = ({ orderId }: OrderDetailBodyProps) => {
  const orderQuery = useOrder(orderId);

  if (orderQuery.isLoading) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const order = orderQuery.data;
  if (!order) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t find that order.</p>
        <Button asChild className="mt-5">
          <Link href="/orders">Back to your orders</Link>
        </Button>
      </div>
    );
  }

  const {
    id,
    total,
    paymentMethod,
    paymentStatus,
    fulfilmentStatus,
    address,
    city,
    items,
    transactions,
  } = order;

  const orderCancelled = fulfilmentStatus === FulfilmentStatus.CANCELLED;
  const awaitingPayment =
    !orderCancelled &&
    paymentMethod !== PaymentMethod.COD &&
    paymentStatus === PaymentStatus.INITIATED;

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="text-center">
        <div
          className={cn(
            "mx-auto flex size-16 items-center justify-center rounded-full",
            awaitingPayment || orderCancelled ? "bg-muted" : "bg-primary",
          )}
        >
          {awaitingPayment ? (
            <Clock className="size-7 text-muted-foreground" strokeWidth={2} />
          ) : orderCancelled ? (
            <Ban className="size-7 text-muted-foreground" strokeWidth={2} />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="size-7 stroke-primary-foreground"
              fill="none"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          Order {id}
        </h1>
        {!orderCancelled && (
          <p className="mt-4 text-sm text-muted-foreground">
            {awaitingPayment
              ? `Rs. ${total.toLocaleString()} via ${paymentMethod} — payment still pending.`
              : paymentMethod === PaymentMethod.COD
                ? `Keep Rs. ${total.toLocaleString()} ready for the rider — you pay when it arrives.`
                : `Payment of Rs. ${total.toLocaleString()} via ${paymentMethod}.`}
          </p>
        )}
      </div>

      {awaitingPayment && (
        <div className="mt-6">
          <PendingPaymentPanel orderId={id} total={total} paymentMethod={paymentMethod} />
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border p-5">
        {!awaitingPayment && <OrderTracker fulfilmentStatus={fulfilmentStatus} />}

        <div
          className={cn(
            "flex justify-between text-sm text-muted-foreground",
            !awaitingPayment && "mt-5 border-t border-border pt-4",
          )}
        >
          <span>Payment</span>
          <StatusBadge status={paymentStatus} />
        </div>
        <div className="flex justify-between py-1.5 text-sm text-muted-foreground">
          <span>Delivering to</span>
          <span className="text-right">
            {address}, {city}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-base font-extrabold text-foreground">
          <span>Total</span>
          <span>Rs. {total.toLocaleString()}</span>
        </div>

        <TransactionLedger transactions={transactions} />
      </div>

      <ul className="mt-4 space-y-1 text-left text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item.id}>
            {item.productName} · {item.sizeLabel} × {item.qty}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center gap-2.5">
        <Button asChild variant="outline">
          <Link href="/orders">All orders</Link>
        </Button>
        <Button asChild>
          <Link href="/">Keep shopping</Link>
        </Button>
      </div>
    </div>
  );
};
