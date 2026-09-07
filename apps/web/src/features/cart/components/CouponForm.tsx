"use client";

import { Button, Input } from "@outfiqe/design-system";
import { X } from "lucide-react";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { AppliedCoupon } from "../api/cartSchemas";
import { useApplyCoupon } from "../hooks/useApplyCoupon";
import { useRemoveCoupon } from "../hooks/useRemoveCoupon";

type CouponFormProps = {
  appliedCoupon: AppliedCoupon | null;
};

export const CouponForm = ({ appliedCoupon }: CouponFormProps) => {
  const [code, setCode] = useState("");
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const submitCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    applyCoupon.mutate(code.trim(), { onSuccess: () => setCode("") });
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <span className="font-semibold text-primary">{appliedCoupon.code} applied</span>
        <button
          type="button"
          aria-label="Remove coupon"
          onClick={() => removeCoupon.mutate()}
          disabled={removeCoupon.isPending}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitCode} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Coupon code"
          aria-label="Coupon code"
          disabled={applyCoupon.isPending}
        />
        <Button type="submit" variant="outline" disabled={applyCoupon.isPending || !code.trim()}>
          {applyCoupon.isPending ? "Applying…" : "Apply"}
        </Button>
      </div>
      {applyCoupon.isError && (
        <p role="alert" className="text-xs text-destructive">
          {getErrorMessage(applyCoupon.error)}
        </p>
      )}
    </form>
  );
};
