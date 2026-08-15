"use client";

import { Button } from "@outfiqe/design-system";
import { Minus, Plus, Shirt, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import type { CartItem } from "../api/cartSchemas";
import { useRemoveCartItem } from "../hooks/useRemoveCartItem";
import { useUpdateCartItem } from "../hooks/useUpdateCartItem";

type CartItemRowProps = {
  item: CartItem;
};

export const CartItemRow = ({ item }: CartItemRowProps) => {
  const {
    id,
    productId,
    productName,
    brandName,
    imageUrl,
    sizeLabel,
    unitPrice,
    qty,
    availableStock,
    soldOut,
    lowStock,
  } = item;

  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  return (
    <div className={cn("flex gap-4 border-b border-border py-5", soldOut && "opacity-60")}>
      <Link
        href={`/product/${productId}`}
        className="flex aspect-3/4 w-20 shrink-0 items-center justify-center rounded-lg bg-muted bg-cover bg-center"
        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}
      >
        {!imageUrl && <Shirt className="size-8 text-foreground/25" strokeWidth={1} />}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
          {brandName}
        </p>
        <Link
          href={`/product/${productId}`}
          className="mt-0.5 block text-sm font-medium text-foreground hover:underline"
        >
          {productName}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Size {sizeLabel}</p>

        {soldOut ? (
          <p className="mt-2 text-xs font-medium text-destructive">
            This size sold out while it was in your bag.
          </p>
        ) : (
          <>
            {lowStock && (
              <p className="mt-1.5 text-xs font-medium text-amber-600">
                Only {availableStock} left — order soon
              </p>
            )}
            <div className="mt-2 inline-flex items-center rounded-lg border border-border">
              <button
                type="button"
                onClick={() => updateItem.mutate({ cartItemId: id, qty: qty - 1 })}
                disabled={updateItem.isPending}
                aria-label="Decrease quantity"
                className="flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="size-3.5" />
              </button>
              <span
                className="w-8 text-center text-sm font-semibold text-foreground"
                aria-live="polite"
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={() => updateItem.mutate({ cartItemId: id, qty: qty + 1 })}
                disabled={updateItem.isPending || qty >= availableStock}
                aria-label="Increase quantity"
                className="flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove from bag"
          onClick={() => removeItem.mutate(id)}
          disabled={removeItem.isPending}
          className="size-8 text-muted-foreground hover:text-destructive"
        >
          <X className="size-4" />
        </Button>
        {!soldOut && (
          <p className="font-display text-sm font-semibold text-foreground">
            Rs. {(unitPrice * qty).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};
