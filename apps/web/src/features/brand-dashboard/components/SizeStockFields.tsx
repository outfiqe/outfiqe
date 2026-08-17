"use client";

import type { SizeOption } from "@/features/products/api/sizeOptionSchemas";

import type { ProductFormInput } from "../schemas/productForm.schema";

type SizeStockFieldsProps = {
  sizeOptions: SizeOption[];
  value: ProductFormInput["sizes"];
  onChange: (next: ProductFormInput["sizes"]) => void;
};

export const SizeStockFields = ({ sizeOptions, value, onChange }: SizeStockFieldsProps) => {
  const isChecked = (sizeOptionId: string) =>
    value.some((size) => size.sizeOptionId === sizeOptionId);
  const stockFor = (sizeOptionId: string) =>
    value.find((size) => size.sizeOptionId === sizeOptionId)?.stock ?? 0;

  const toggleSize = (sizeOptionId: string) => {
    if (isChecked(sizeOptionId)) {
      onChange(value.filter((size) => size.sizeOptionId !== sizeOptionId));
    } else {
      onChange([...value, { sizeOptionId, stock: 0 }]);
    }
  };

  const setStock = (sizeOptionId: string, stock: number) => {
    onChange(value.map((size) => (size.sizeOptionId === sizeOptionId ? { ...size, stock } : size)));
  };

  if (sizeOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sizes have been set up for this product type yet — ask an admin to add some.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sizeOptions.map((sizeOption) => (
        <div key={sizeOption.id} className="flex items-center gap-3">
          <label className="flex w-24 shrink-0 items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={isChecked(sizeOption.id)}
              onChange={() => toggleSize(sizeOption.id)}
            />
            {sizeOption.label}
          </label>
          {isChecked(sizeOption.id) && (
            <input
              type="number"
              min={0}
              aria-label={`Stock for size ${sizeOption.label}`}
              placeholder="Stock"
              className="h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
              value={stockFor(sizeOption.id)}
              onChange={(event) => setStock(sizeOption.id, Number(event.target.value))}
            />
          )}
        </div>
      ))}
    </div>
  );
};
