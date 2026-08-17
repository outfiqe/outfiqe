"use client";

import { Button, Modal, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { useAdjustStock } from "../hooks/useAdjustStock";

type StockModalProps = {
  product: BrandProduct | null;
  onClose: () => void;
};

export const StockModal = ({ product, onClose }: StockModalProps) => {
  const adjustStock = useAdjustStock();
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  const close = () => {
    setDeltas({});
    onClose();
  };

  if (!product) return null;

  const onSubmit = async () => {
    const adjustments = Object.entries(deltas)
      .filter(([, delta]) => delta !== 0)
      .map(([sizeId, delta]) => ({ sizeId, delta }));

    if (adjustments.length === 0) {
      close();
      return;
    }

    try {
      await adjustStock.mutateAsync({ productId: product.id, adjustments });
      toast.success("Stock updated");
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={`Manage stock — ${product.name}`}
      description="Enter units to add per size. Use a negative number to correct an overcount."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={adjustStock.isPending || product.sizes.length === 0}
          >
            {adjustStock.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {product.sizes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This product has no sizes on record — it was added before sizes existed, so there&apos;s
            nothing to restock here.
          </p>
        )}

        {product.sizes.map((size) => (
          <div key={size.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{size.label}</p>
              <p className="text-xs text-muted-foreground">{size.stock} in stock</p>
            </div>
            <input
              type="number"
              placeholder="Adjust by"
              aria-label={`Adjust stock for size ${size.label}`}
              className="h-9 w-32 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
              value={deltas[size.id] ?? ""}
              onChange={(event) =>
                setDeltas((previous) => ({
                  ...previous,
                  [size.id]: event.target.value === "" ? 0 : Number(event.target.value),
                }))
              }
            />
          </div>
        ))}
      </div>
    </Modal>
  );
};
