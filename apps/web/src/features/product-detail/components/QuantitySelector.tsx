"use client";

import { Minus, Plus } from "lucide-react";

const MIN_QUANTITY = 1;
const DEFAULT_MAX_QUANTITY = 10;

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  max?: number;
}

export function QuantitySelector({
  quantity,
  onChange,
  max = DEFAULT_MAX_QUANTITY,
}: QuantitySelectorProps) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-xs text-muted-foreground">Quantity</p>
      <div className="inline-flex items-center rounded-lg border border-border">
        <button
          type="button"
          onClick={() => onChange(Math.max(MIN_QUANTITY, quantity - 1))}
          disabled={quantity <= MIN_QUANTITY}
          aria-label="Decrease quantity"
          className="flex size-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-10 text-center text-sm font-semibold text-foreground" aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, quantity + 1))}
          disabled={quantity >= max}
          aria-label="Increase quantity"
          className="flex size-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
