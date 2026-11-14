"use client";

import { Input, Select } from "@outfiqe/design-system";

import { useProductSizeLabels } from "../hooks/useProductSizeLabels";

const NO_SIZES = 0;
const FIELD_CLASS_NAME = "h-8 w-28 shrink-0";

type TaggedProductSizeFieldProps = {
  productId: string;
  productName: string;
  sizeWorn: string;
  hasError: boolean;
  onSizeChange: (sizeWorn: string) => void;
};

export const TaggedProductSizeField = ({
  productId,
  productName,
  sizeWorn,
  hasError,
  onSizeChange,
}: TaggedProductSizeFieldProps) => {
  const { sizeLabels, isLoading } = useProductSizeLabels(productId);
  const fieldLabel = `Size worn for ${productName}`;
  const canPickFromSizes = !isLoading && sizeLabels.length > NO_SIZES;

  if (!canPickFromSizes) {
    return (
      <Input
        placeholder="Size (e.g. M)"
        className={FIELD_CLASS_NAME}
        value={sizeWorn}
        disabled={isLoading}
        aria-invalid={hasError ? true : undefined}
        aria-label={fieldLabel}
        onChange={(event) => onSizeChange(event.target.value)}
      />
    );
  }

  const options =
    sizeWorn && !sizeLabels.includes(sizeWorn) ? [sizeWorn, ...sizeLabels] : sizeLabels;

  return (
    <Select
      className={FIELD_CLASS_NAME}
      value={sizeWorn}
      aria-invalid={hasError ? true : undefined}
      aria-label={fieldLabel}
      onChange={(event) => onSizeChange(event.target.value)}
    >
      <option value="">Size worn</option>
      {options.map((sizeLabel) => (
        <option key={sizeLabel} value={sizeLabel}>
          {sizeLabel}
        </option>
      ))}
    </Select>
  );
};
