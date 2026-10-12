"use client";

import { Checkbox, Input } from "@outfiqe/design-system";
import { useId } from "react";

import type { SizeStandard } from "../api/sizeStandardSchemas";
import type { ProductSizeFormRow } from "../schemas/productForm.schema";
import {
  EMPTY_FIT_RANGE_DRAFT,
  findFitRangeDraftProblem,
  type FitRangeDraft,
  toFitRange,
} from "../schemas/sizeChart.schema";
import { findSizeChartWarnings } from "../utils/sizeChartWarnings";
import { FitRangeInputs } from "./FitRangeInputs";

const NO_STOCK = 0;

type SizeChartFieldsProps = {
  standard: SizeStandard;
  supportsFitRanges: boolean;
  value: ProductSizeFormRow[];
  onChange: (nextSizes: ProductSizeFormRow[]) => void;
};

export const SizeChartFields = ({
  standard,
  supportsFitRanges,
  value,
  onChange,
}: SizeChartFieldsProps) => {
  const fieldIdPrefix = useId();
  const rowByLabelId = new Map(value.map((row) => [row.standardLabelId, row]));
  const includedRowsInStandardOrder = standard.labels.flatMap(({ id }) => {
    const row = rowByLabelId.get(id);
    return row ? [row] : [];
  });
  const sizeChartWarnings = supportsFitRanges
    ? findSizeChartWarnings(
        includedRowsInStandardOrder.map(({ label, fitRange }) => ({
          label,
          fitRange: toFitRange(fitRange),
        })),
      )
    : [];

  const replaceRows = (nextRowByLabelId: Map<string, ProductSizeFormRow>) =>
    onChange(
      standard.labels.flatMap(({ id }) => {
        const row = nextRowByLabelId.get(id);
        return row ? [row] : [];
      }),
    );

  const toggleSize = (standardLabelId: string, label: string) => {
    const nextRowByLabelId = new Map(rowByLabelId);
    if (nextRowByLabelId.has(standardLabelId)) {
      nextRowByLabelId.delete(standardLabelId);
    } else {
      nextRowByLabelId.set(standardLabelId, {
        standardLabelId,
        label,
        stock: NO_STOCK,
        fitRange: EMPTY_FIT_RANGE_DRAFT,
      });
    }
    replaceRows(nextRowByLabelId);
  };

  const updateRow = (standardLabelId: string, changes: Partial<ProductSizeFormRow>) => {
    const row = rowByLabelId.get(standardLabelId);
    if (!row) return;
    replaceRows(new Map(rowByLabelId).set(standardLabelId, { ...row, ...changes }));
  };

  return (
    <div className="space-y-2">
      {supportsFitRanges && (
        <p className="text-xs text-muted-foreground">
          For each size, enter the height and weight it is cut for. Shoppers see this chart on the
          product page and get a size recommended from it.
        </p>
      )}

      {standard.labels.map(({ id: standardLabelId, label }) => {
        const row = rowByLabelId.get(standardLabelId);
        const checkboxId = `${fieldIdPrefix}-${standardLabelId}`;
        const rangeProblem =
          row && supportsFitRanges ? findFitRangeDraftProblem(row.fitRange) : null;

        return (
          <div key={standardLabelId} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor={checkboxId}
                className="flex w-24 shrink-0 items-center gap-2 text-sm font-medium text-foreground"
              >
                <Checkbox
                  id={checkboxId}
                  checked={row !== undefined}
                  onChange={() => toggleSize(standardLabelId, label)}
                />
                {label}
              </label>
              {row && (
                <Input
                  type="number"
                  min={NO_STOCK}
                  aria-label={`Stock for size ${label}`}
                  placeholder="Stock"
                  className="h-9 w-28"
                  value={row.stock === NO_STOCK ? "" : row.stock}
                  onChange={(event) =>
                    updateRow(standardLabelId, {
                      stock: event.target.value === "" ? NO_STOCK : Number(event.target.value),
                    })
                  }
                />
              )}
            </div>

            {row && supportsFitRanges && (
              <FitRangeInputs
                sizeLabel={label}
                value={row.fitRange}
                problem={rangeProblem}
                onChange={(nextFitRange: FitRangeDraft) =>
                  updateRow(standardLabelId, { fitRange: nextFitRange })
                }
              />
            )}
          </div>
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
    </div>
  );
};
