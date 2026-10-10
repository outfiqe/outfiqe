import type { FitRange } from "@outfiqe/utils";

export type ChartedSizeRow = {
  label: string;
  fitRange: FitRange | null;
};

const NEXT_WHOLE_UNIT = 1;
const NEXT_SIZE_STEP = 1;

const isRangeInside = (inner: FitRange, outer: FitRange): boolean =>
  inner.minHeightCm >= outer.minHeightCm &&
  inner.maxHeightCm <= outer.maxHeightCm &&
  inner.minWeightKg >= outer.minWeightKg &&
  inner.maxWeightKg <= outer.maxWeightKg;

const describeGap = (smaller: string, larger: string, unit: string, from: number, to: number) =>
  `Nobody between ${from} and ${to} ${unit} gets a fitting size: ${smaller} ends before ${larger} starts.`;

export const findSizeChartWarnings = (rowsInSizeOrder: ChartedSizeRow[]): string[] => {
  const chartedRows = rowsInSizeOrder.flatMap(({ label, fitRange }) =>
    fitRange ? [{ label, fitRange }] : [],
  );

  return chartedRows.flatMap((smallerRow, index) => {
    const largerRow = chartedRows[index + NEXT_SIZE_STEP];
    if (!largerRow) return [];
    const { label: smallerLabel, fitRange: smallerRange } = smallerRow;
    const { label: largerLabel, fitRange: largerRange } = largerRow;
    const warnings: string[] = [];

    if (largerRange.minHeightCm > smallerRange.maxHeightCm + NEXT_WHOLE_UNIT) {
      warnings.push(
        describeGap(
          smallerLabel,
          largerLabel,
          "cm",
          smallerRange.maxHeightCm + NEXT_WHOLE_UNIT,
          largerRange.minHeightCm - NEXT_WHOLE_UNIT,
        ),
      );
    }
    if (largerRange.minWeightKg > smallerRange.maxWeightKg + NEXT_WHOLE_UNIT) {
      warnings.push(
        describeGap(
          smallerLabel,
          largerLabel,
          "kg",
          smallerRange.maxWeightKg + NEXT_WHOLE_UNIT,
          largerRange.minWeightKg - NEXT_WHOLE_UNIT,
        ),
      );
    }
    if (isRangeInside(smallerRange, largerRange) || isRangeInside(largerRange, smallerRange)) {
      warnings.push(
        `${smallerLabel} and ${largerLabel} cover the same people, so shoppers can't tell them apart.`,
      );
    }
    return warnings;
  });
};
