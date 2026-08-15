"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";

import { useInfiniteOrders } from "../hooks/useInfiniteOrders";
import { OrderRow } from "./OrderRow";

export const OrdersListBody = () => {
  const router = useRouter();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const ordersQuery = useInfiniteOrders();

  if (!isAuthResolved) return null;

  if (!isAuthenticated) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/orders")}
            className="font-semibold text-primary-strong"
          >
            Sign in
          </button>{" "}
          to see your orders.
        </p>
      </div>
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="space-y-3 py-6">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const orders = ordersQuery.data?.pages.flatMap((page) => page.orders) ?? [];

  if (orders.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-muted-foreground">
          When you buy something it&apos;ll show up here with its delivery status.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-6">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
      {ordersQuery.hasNextPage && (
        <button
          type="button"
          onClick={() => void ordersQuery.fetchNextPage()}
          disabled={ordersQuery.isFetchingNextPage}
          className="mx-auto block rounded-full border border-foreground px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          {ordersQuery.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
};
