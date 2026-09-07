import { Badge, Button, toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { getErrorMessage } from "@/lib/errorMessages";

import { ordersApi } from "./api";
import { useOrder } from "./hooks/useOrder";
import { FULFILMENT_STATUS_TONE, PAYMENT_STATUS_TONE } from "./orderStatusTone";
import type { FulfilmentStatusValue } from "./schemas";

const NEXT_FULFILMENT_STATUS: Partial<Record<FulfilmentStatusValue, FulfilmentStatusValue>> = {
  PLACED: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const CANCELLABLE_STATUSES: FulfilmentStatusValue[] = ["PLACED", "PACKED"];

type OrderDetailPageProps = {
  orderId: string;
};

export const OrderDetailPage = ({ orderId }: OrderDetailPageProps) => {
  const queryClient = useQueryClient();
  const { data: order, isLoading, error } = useOrder(orderId);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const advance = useMutation({
    mutationFn: (status: FulfilmentStatusValue) => ordersApi.advanceFulfilment(orderId, status),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const cancel = useMutation({
    mutationFn: (reason: string) => ordersApi.cancel(orderId, reason),
    onSuccess: () => {
      invalidate();
      setIsCancelModalOpen(false);
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !order) return <p className="text-sm text-destructive">Couldn&apos;t load order.</p>;

  const {
    id,
    createdAt,
    fullName,
    phone,
    address,
    city,
    landmark,
    paymentMethod,
    paymentStatus,
    fulfilmentStatus,
    subtotal,
    deliveryFee,
    codFee,
    total,
    items,
    transactions,
    buyerName,
    buyerEmail,
    needsManualRefund,
  } = order;

  const nextStatus = NEXT_FULFILMENT_STATUS[fulfilmentStatus];
  const isActing = advance.isPending || cancel.isPending;

  return (
    <div>
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-1.5">
          {needsManualRefund && (
            <Badge tone="negative" showDot={false}>
              Needs manual refund
            </Badge>
          )}
          <Badge tone={PAYMENT_STATUS_TONE[paymentStatus]} showDot={false}>
            {paymentStatus}
          </Badge>
          <Badge tone={FULFILMENT_STATUS_TONE[fulfilmentStatus]} showDot={false}>
            {fulfilmentStatus}
          </Badge>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {nextStatus && (
          <Button onClick={() => advance.mutate(nextStatus)} disabled={isActing}>
            Mark as {nextStatus.toLowerCase()}
          </Button>
        )}
        {CANCELLABLE_STATUSES.includes(fulfilmentStatus) && (
          <Button variant="outline" onClick={() => setIsCancelModalOpen(true)} disabled={isActing}>
            Cancel order
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-bold text-foreground">Buyer</h2>
          <p className="mt-2 text-sm text-foreground">{buyerName}</p>
          <p className="text-sm text-muted-foreground">{buyerEmail}</p>
          <p className="mt-2 text-sm text-foreground">{fullName}</p>
          <p className="text-sm text-muted-foreground">{phone}</p>
          <p className="text-sm text-muted-foreground">
            {address}, {city}
            {landmark ? ` — ${landmark}` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-bold text-foreground">Totals</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="text-foreground">Rs. {subtotal.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery fee</dt>
              <dd className="text-foreground">Rs. {deliveryFee.toLocaleString()}</dd>
            </div>
            {codFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">COD fee</dt>
                <dd className="text-foreground">Rs. {codFee.toLocaleString()}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <dt className="text-foreground">Total</dt>
              <dd className="text-foreground">Rs. {total.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-muted-foreground">Payment method</dt>
              <dd className="text-foreground">{paymentMethod}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-bold text-foreground">Items</h2>
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="text-foreground">
                  {item.productName} · {item.sizeLabel} × {item.qty}
                </p>
                <p className="text-muted-foreground">
                  {item.brandName}
                  {item.attributedCreatorName ? ` · via ${item.attributedCreatorName}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-foreground">Rs. {item.unitPrice.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-bold text-foreground">Transactions</h2>
          <div className="mt-2 space-y-2">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between text-sm">
                <p className="text-foreground">
                  {transaction.type} · {transaction.provider}
                </p>
                <p className="text-muted-foreground">
                  {transaction.status} · {new Date(transaction.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <TextPromptModal
        open={isCancelModalOpen}
        title="Cancel order"
        label="Reason for cancelling this order"
        confirmLabel="Cancel order"
        pendingLabel="Cancelling…"
        isPending={cancel.isPending}
        onConfirm={(reason) => cancel.mutate(reason)}
        onCancel={() => setIsCancelModalOpen(false)}
      />
    </div>
  );
};
