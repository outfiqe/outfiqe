"use client";

import { Button, Input } from "@outfiqe/design-system";
import { X } from "lucide-react";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BuyNowCouponPreview } from "../api/checkoutApi";
import type { BuyNowLine } from "../api/checkoutSchemas";
import { useBuyNowCouponPreview } from "../hooks/useBuyNowCouponPreview";

type BuyNowCouponFormProps = {
  line: BuyNowLine;
  appliedCoupon: BuyNowCouponPreview | null;
  onApplied: (coupon: BuyNowCouponPreview) => void;
  onRemoved: () => void;
};

export const BuyNowCouponForm = ({
  line,
  appliedCoupon,
  onApplied,
  onRemoved,
}: BuyNowCouponFormProps) => {
  const [code, setCode] = useState("");
  const preview = useBuyNowCouponPreview();

  const submitCode = () => {
    if (!code.trim() || preview.isPending) return;
    preview.mutate(
      { code: code.trim(), line },
      {
        onSuccess: (result) => {
          onApplied(result);
          setCode("");
        },
      },
    );
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <span className="font-semibold text-primary">{appliedCoupon.code} applied</span>
        <button
          type="button"
          aria-label="Remove coupon"
          onClick={onRemoved}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitCode();
            }
          }}
          placeholder="Coupon code"
          aria-label="Coupon code"
          disabled={preview.isPending}
        />
        <Button
          type="button"
          variant="outline"
          onClick={submitCode}
          disabled={preview.isPending || !code.trim()}
        >
          {preview.isPending ? "Applying…" : "Apply"}
        </Button>
      </div>
      {preview.isError && (
        <p role="alert" className="text-xs text-destructive">
          {getErrorMessage(preview.error)}
        </p>
      )}
    </div>
  );
};
