"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { checkoutApi } from "@/features/checkout";

type OrderConfirmationBodyProps = {
  orderId: string;
};

export const OrderConfirmationBody = ({ orderId }: OrderConfirmationBodyProps) => {
  const orderQuery = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => checkoutApi.get(orderId),
  });

  if (orderQuery.isLoading) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const order = orderQuery.data;
  if (!order) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t find that order.</p>
        <Button asChild className="mt-5">
          <Link href="/">Back to shopping</Link>
        </Button>
      </div>
    );
  }

  const { id, total, paymentMethod, paymentStatus, address, city, items } = order;

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary">
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
      </div>
      <h1 className="mt-5 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
        Order placed
      </h1>
      <p className="mt-1 font-display text-xs tracking-widest text-muted-foreground">{id}</p>

      <p className="mt-4 text-sm text-muted-foreground">
        {paymentMethod === "COD"
          ? `Keep Rs. ${total.toLocaleString()} ready for the rider — you pay when it arrives.`
          : `Payment of Rs. ${total.toLocaleString()} received via ${paymentMethod}.`}
      </p>

      <div className="mt-6 rounded-2xl border border-border p-5 text-left">
        <div className="flex justify-between py-1.5 text-sm text-muted-foreground">
          <span>Payment</span>
          <span>
            {paymentMethod} · {paymentStatus === "DUE" ? "Due on delivery" : paymentStatus}
          </span>
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
          <Link href="/orders">Track this order</Link>
        </Button>
        <Button asChild>
          <Link href="/">Keep shopping</Link>
        </Button>
      </div>
    </div>
  );
};
