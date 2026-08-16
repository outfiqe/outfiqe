"use client";

import { cn } from "@/shared/lib/cn";

import type { PaymentMethodValue } from "../api/checkoutSchemas";
import { PAYMENT_METHODS } from "../checkout.constants";

type PaymentMethodFieldProps = {
  value: PaymentMethodValue;
  onChange: (value: PaymentMethodValue) => void;
};

export const PaymentMethodField = ({ value, onChange }: PaymentMethodFieldProps) => {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">Payment method</p>
      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            disabled={!method.enabled}
            aria-pressed={value === method.value}
            onClick={() => onChange(method.value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
              !method.enabled && "cursor-not-allowed opacity-50",
              method.enabled &&
                value === method.value &&
                "border-2 border-foreground px-[15px] py-[13px]",
              method.enabled && value !== method.value && "border-border hover:border-foreground",
            )}
          >
            <span
              className={cn(
                "size-4 shrink-0 rounded-full border-2",
                value === method.value ? "border-foreground" : "border-border",
              )}
            >
              {value === method.value && (
                <span className="block size-full scale-50 rounded-full bg-foreground" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">{method.label}</span>
              <span className="block text-xs text-muted-foreground">
                {method.enabled ? method.description : "Coming soon"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
