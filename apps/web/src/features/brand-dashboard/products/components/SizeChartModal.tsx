"use client";

import { Button, FormBanner, Modal, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { useUpdateSizeChart } from "../hooks/useUpdateProduct";
import {
  findFitRangeDraftProblem,
  type FitRangeDraft,
  toFitRange,
  toFitRangeDraft,
} from "../schemas/sizeChart.schema";
import { findSizeChartWarnings } from "../utils/sizeChartWarnings";
import { FabricStretchField } from "./FabricStretchField";
import { FitRangeInputs } from "./FitRangeInputs";

type SizeChartModalProps = {
  product: BrandProduct;
  onClose: () => void;
};

export const SizeChartModal = ({ product, onClose }: SizeChartModalProps) => {
  const { id: productId, name, sizes } = product;
  const updateSizeChart = useUpdateSizeChart();
  const [fitRangeDraftBySizeId, setFitRangeDraftBySizeId] = useState(
    () => new Map(sizes.map(({ id, fitRange }) => [id, toFitRangeDraft(fitRange)])),
  );
  const [isStretchable, setIsStretchable] = useState(product.isStretchable);

  const draftFor = (sizeId: string): FitRangeDraft =>
    fitRangeDraftBySizeId.get(sizeId) ?? toFitRangeDraft(null);
  const hasRangeProblem = sizes.some(({ id }) => findFitRangeDraftProblem(draftFor(id)) !== null);
  const sizeChartWarnings = findSizeChartWarnings(
    sizes.map(({ id, label }) => ({ label, fitRange: toFitRange(draftFor(id)) })),
  );

  const saveSizeChart = async () => {
    try {
      await updateSizeChart.mutateAsync({
        productId,
        sizeChart: {
          isStretchable,
          sizes: sizes.map(({ id }) => ({ sizeId: id, fitRange: toFitRange(draftFor(id)) })),
        },
      });
      toast.success("Size chart saved");
      onClose();
    } catch {
      return;
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Size chart for ${name}`}
      description="The height and weight each size is cut for. Shoppers see this on the product page, and you can change it at any time, even after sales."
      className="sm:max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void saveSizeChart()}
            disabled={hasRangeProblem}
            isLoading={updateSizeChart.isPending}
          >
            Save size chart
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {updateSizeChart.isError && (
          <FormBanner>{getErrorMessage(updateSizeChart.error)}</FormBanner>
        )}

        {sizes.map(({ id, label }) => {
          const fitRangeDraft = draftFor(id);
          return (
            <fieldset key={id} className="rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-semibold text-foreground">{label}</legend>
              <FitRangeInputs
                sizeLabel={label}
                value={fitRangeDraft}
                problem={findFitRangeDraftProblem(fitRangeDraft)}
                onChange={(nextFitRange) =>
                  setFitRangeDraftBySizeId(new Map(fitRangeDraftBySizeId).set(id, nextFitRange))
                }
              />
            </fieldset>
          );
        })}

        {sizeChartWarnings.length > 0 && (
          <ul
            className="space-y-1 rounded-lg bg-muted p-3 text-xs text-foreground"
            aria-live="polite"
          >
            {sizeChartWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        <FabricStretchField value={isStretchable} onChange={setIsStretchable} />
      </div>
    </Modal>
  );
};
