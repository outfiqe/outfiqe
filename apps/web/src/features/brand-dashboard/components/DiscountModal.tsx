"use client";

import { Button, Modal, Select, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandProduct } from "../api/brandProductsSchemas";
import {
  useRemoveProductDiscount,
  useSetProductDiscount,
  useUpdateProductDiscount,
} from "../hooks/useProductDiscount";

type DiscountModalProps = {
  product: BrandProduct | null;
  onClose: () => void;
};

const PERCENT_BASIS_POINTS_PER_PERCENT = 100;
const DEFAULT_PERCENT_OFF = 20;

export const DiscountModal = ({ product, onClose }: DiscountModalProps) => {
  const setDiscount = useSetProductDiscount();
  const updateDiscount = useUpdateProductDiscount();
  const removeDiscount = useRemoveProductDiscount();

  const existing = product?.activeDiscount ?? null;
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(
    existing?.discountType ?? "PERCENT",
  );
  const [percentOff, setPercentOff] = useState(
    existing?.percentBasisPoints
      ? existing.percentBasisPoints / PERCENT_BASIS_POINTS_PER_PERCENT
      : DEFAULT_PERCENT_OFF,
  );
  const [fixedAmount, setFixedAmount] = useState(existing?.fixedAmount ?? 0);
  const [endsAt, setEndsAt] = useState(existing?.endsAt?.slice(0, 10) ?? "");

  const isPending = setDiscount.isPending || updateDiscount.isPending || removeDiscount.isPending;

  if (!product) return null;

  const close = () => {
    setDiscountType("PERCENT");
    setPercentOff(DEFAULT_PERCENT_OFF);
    setFixedAmount(0);
    setEndsAt("");
    onClose();
  };

  const submit = async () => {
    const amountFields = {
      percentBasisPoints:
        discountType === "PERCENT"
          ? Math.round(percentOff * PERCENT_BASIS_POINTS_PER_PERCENT)
          : undefined,
      fixedAmount: discountType === "FIXED" ? fixedAmount : undefined,
    };
    const endsAtIso = endsAt ? new Date(endsAt).toISOString() : null;

    try {
      if (existing) {
        await updateDiscount.mutateAsync({
          productId: product.id,
          input: { discountType, ...amountFields, endsAt: endsAtIso },
        });
      } else {
        await setDiscount.mutateAsync({
          productId: product.id,
          input: {
            discountType,
            ...amountFields,
            startsAt: new Date().toISOString(),
            endsAt: endsAtIso,
          },
        });
      }
      toast.success(existing ? "Discount updated" : "Discount created");
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const remove = async () => {
    try {
      await removeDiscount.mutateAsync(product.id);
      toast.success("Discount removed");
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={`Sale price — ${product.name}`}
      description={`List price Rs. ${product.price.toLocaleString()}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {existing ? (
            <Button
              variant="outline"
              onClick={() => void remove()}
              disabled={isPending}
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              {removeDiscount.isPending ? "Removing…" : "Remove discount"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={isPending}>
              {setDiscount.isPending || updateDiscount.isPending
                ? "Saving…"
                : existing
                  ? "Save changes"
                  : "Start sale"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="discount-type"
          >
            Discount type
          </label>
          <Select
            id="discount-type"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as "PERCENT" | "FIXED")}
          >
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Fixed amount off</option>
          </Select>
        </div>

        {discountType === "PERCENT" ? (
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-foreground"
              htmlFor="percent-off"
            >
              Percent off
            </label>
            <input
              id="percent-off"
              type="number"
              min={1}
              max={70}
              value={percentOff}
              onChange={(event) => setPercentOff(Number(event.target.value))}
              className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Rs. {Math.round(product.price * (1 - percentOff / 100)).toLocaleString()} effective
              price
            </p>
          </div>
        ) : (
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-foreground"
              htmlFor="fixed-amount"
            >
              Amount off (Rs.)
            </label>
            <input
              id="fixed-amount"
              type="number"
              min={1}
              max={product.price - 1}
              value={fixedAmount}
              onChange={(event) => setFixedAmount(Number(event.target.value))}
              className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Rs. {Math.max(product.price - fixedAmount, 1).toLocaleString()} effective price
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="ends-at">
            Ends on (optional)
          </label>
          <input
            id="ends-at"
            type="date"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank to run until you remove it.
          </p>
        </div>
      </div>
    </Modal>
  );
};
