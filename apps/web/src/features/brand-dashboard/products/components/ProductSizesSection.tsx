"use client";

import { Button, Select, Skeleton } from "@outfiqe/design-system";
import { Plus } from "lucide-react";
import { useId, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useSizeStandards } from "../hooks/useSizeStandards";
import type { ProductSizeFormRow } from "../schemas/productForm.schema";
import { FabricStretchField } from "./FabricStretchField";
import { SizeChartFields } from "./SizeChartFields";
import { SizeStandardEditor } from "./SizeStandardEditor";

type ProductSizesSectionProps = {
  sizeStandardId: string;
  onSizeStandardChange: (sizeStandardId: string) => void;
  sizes: ProductSizeFormRow[];
  onSizesChange: (nextSizes: ProductSizeFormRow[]) => void;
  isStretchable: boolean | null;
  onStretchChange: (isStretchable: boolean) => void;
  supportsFitRanges: boolean;
  sizeStandardError?: string;
  sizesError?: string;
};

export const ProductSizesSection = ({
  sizeStandardId,
  onSizeStandardChange,
  sizes,
  onSizesChange,
  isStretchable,
  onStretchChange,
  supportsFitRanges,
  sizeStandardError,
  sizesError,
}: ProductSizesSectionProps) => {
  const pickerId = useId();
  const { data: standards, isPending, isError, error, refetch } = useSizeStandards();
  const [isCreatingStandard, setIsCreatingStandard] = useState(false);
  const selectedStandard = standards?.find(({ id }) => id === sizeStandardId);
  const hasNoStandards = standards?.length === 0;
  const isEditorShown = isCreatingStandard || hasNoStandards;

  const pickStandard = (nextStandardId: string) => {
    onSizeStandardChange(nextStandardId);
    onSizesChange([]);
  };

  if (isPending) return <Skeleton className="h-24 rounded-lg" />;

  if (isError) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your size standards. {getErrorMessage(error)}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={pickerId} className="mb-1.5 block text-sm font-medium text-foreground">
          Size standard
        </label>
        {isEditorShown ? (
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              {hasNoStandards
                ? "Set up the sizes you cut in. Every product's sizes come from one of your size standards."
                : "Create a new size standard for this product."}
            </p>
            <SizeStandardEditor
              onSaved={(savedStandard) => {
                setIsCreatingStandard(false);
                pickStandard(savedStandard.id);
              }}
              onCancel={() => setIsCreatingStandard(false)}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Select
              id={pickerId}
              className="min-w-0 flex-1"
              value={sizeStandardId}
              aria-invalid={sizeStandardError ? true : undefined}
              onChange={(event) => pickStandard(event.target.value)}
            >
              <option value="" disabled>
                Pick a size standard
              </option>
              {standards?.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={() => setIsCreatingStandard(true)}>
              <Plus className="size-4" />
              New size standard
            </Button>
          </div>
        )}
        {sizeStandardError && !isEditorShown && (
          <p className="mt-1.5 text-xs text-destructive">{sizeStandardError}</p>
        )}
      </div>

      {selectedStandard && !isEditorShown && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">
            {supportsFitRanges ? "Sizes, stock and size chart" : "Sizes and stock"}
          </p>
          <SizeChartFields
            standard={selectedStandard}
            supportsFitRanges={supportsFitRanges}
            value={sizes}
            onChange={onSizesChange}
          />
          {sizesError && <p className="mt-1.5 text-xs text-destructive">{sizesError}</p>}
        </div>
      )}

      {supportsFitRanges && <FabricStretchField value={isStretchable} onChange={onStretchChange} />}
    </div>
  );
};
