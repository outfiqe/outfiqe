export const FIT_HEIGHT_CM_MIN = 50;
export const FIT_HEIGHT_CM_MAX = 230;
export const FIT_WEIGHT_KG_MIN = 10;
export const FIT_WEIGHT_KG_MAX = 200;

export const HEIGHT_STEP_CM = 5;
export const WEIGHT_STEP_KG = 5;
export const NEAR_FIT_MAX = 1;
export const TIE_MARGIN = 0.25;
export const EDGE_ZONE_RATIO = 0.2;

const PERFECT_FIT_DISTANCE = 0;
const RANGE_MIDPOINT_RATIO = 0.5;
const FULL_RANGE_RATIO = 1;
const NEXT_SIZE_STEP = 1;

export const FIT_OUTCOME = {
  SINGLE: "SINGLE",
  BETWEEN_SIZES: "BETWEEN_SIZES",
  NO_FIT: "NO_FIT",
  NO_CHART: "NO_CHART",
} as const;

export type FitOutcome = (typeof FIT_OUTCOME)[keyof typeof FIT_OUTCOME];

export const FIT_ALTERNATIVE_REASON = {
  ALSO_FITS: "ALSO_FITS",
  SIZE_UP_FOR_ROOM: "SIZE_UP_FOR_ROOM",
} as const;

export type FitAlternativeReason =
  (typeof FIT_ALTERNATIVE_REASON)[keyof typeof FIT_ALTERNATIVE_REASON];

export type FitRange = {
  minHeightCm: number;
  maxHeightCm: number;
  minWeightKg: number;
  maxWeightKg: number;
};

export type FitMeasurements = {
  heightCm: number;
  weightKg: number;
};

export type FitSizeCandidate = {
  sizeId: string;
  label: string;
  fitRange: FitRange | null;
};

export type FitSizeMatch = {
  sizeId: string;
  label: string;
};

export type FitRecommendation =
  | { outcome: typeof FIT_OUTCOME.NO_CHART }
  | {
      outcome: typeof FIT_OUTCOME.SINGLE;
      primary: FitSizeMatch;
      alternative: FitSizeMatch | null;
      alternativeReason: FitAlternativeReason | null;
      isDecidedByStretch: boolean;
    }
  | {
      outcome: typeof FIT_OUTCOME.BETWEEN_SIZES;
      primary: FitSizeMatch;
      alternative: FitSizeMatch;
      isDecidedByStretch: boolean;
    }
  | {
      outcome: typeof FIT_OUTCOME.NO_FIT;
      nearest: FitSizeMatch;
      heightOffsetCm: number;
      weightOffsetKg: number;
    };

type ChartedSize = {
  sizeId: string;
  label: string;
  fitRange: FitRange;
  chartIndex: number;
  fitDistance: number;
};

type PreferredOfTwo = {
  preferred: ChartedSize;
  other: ChartedSize;
  isDecidedByStretch: boolean;
};

export const isMeasurementWithinBounds = ({ heightCm, weightKg }: FitMeasurements): boolean =>
  Number.isFinite(heightCm) &&
  Number.isFinite(weightKg) &&
  heightCm >= FIT_HEIGHT_CM_MIN &&
  heightCm <= FIT_HEIGHT_CM_MAX &&
  weightKg >= FIT_WEIGHT_KG_MIN &&
  weightKg <= FIT_WEIGHT_KG_MAX;

export const isFitRangeOrdered = ({
  minHeightCm,
  maxHeightCm,
  minWeightKg,
  maxWeightKg,
}: FitRange): boolean => minHeightCm <= maxHeightCm && minWeightKg <= maxWeightKg;

const offsetOutsideRange = (value: number, rangeMin: number, rangeMax: number): number => {
  if (value < rangeMin) return value - rangeMin;
  if (value > rangeMax) return value - rangeMax;
  return PERFECT_FIT_DISTANCE;
};

const measureFitDistance = (
  { minHeightCm, maxHeightCm, minWeightKg, maxWeightKg }: FitRange,
  { heightCm, weightKg }: FitMeasurements,
): number =>
  Math.abs(offsetOutsideRange(heightCm, minHeightCm, maxHeightCm)) / HEIGHT_STEP_CM +
  Math.abs(offsetOutsideRange(weightKg, minWeightKg, maxWeightKg)) / WEIGHT_STEP_KG;

const positionWithinRange = (value: number, rangeMin: number, rangeMax: number): number =>
  rangeMax === rangeMin ? RANGE_MIDPOINT_RATIO : (value - rangeMin) / (rangeMax - rangeMin);

const measureDistanceFromCentre = (
  { minHeightCm, maxHeightCm, minWeightKg, maxWeightKg }: FitRange,
  { heightCm, weightKg }: FitMeasurements,
): number =>
  Math.abs(positionWithinRange(heightCm, minHeightCm, maxHeightCm) - RANGE_MIDPOINT_RATIO) +
  Math.abs(positionWithinRange(weightKg, minWeightKg, maxWeightKg) - RANGE_MIDPOINT_RATIO);

const isInUpperEdgeZone = (
  { minHeightCm, maxHeightCm, minWeightKg, maxWeightKg }: FitRange,
  { heightCm, weightKg }: FitMeasurements,
): boolean => {
  const upperEdgeStart = FULL_RANGE_RATIO - EDGE_ZONE_RATIO;
  return (
    positionWithinRange(heightCm, minHeightCm, maxHeightCm) >= upperEdgeStart ||
    positionWithinRange(weightKg, minWeightKg, maxWeightKg) >= upperEdgeStart
  );
};

const toSizeMatch = ({ sizeId, label }: ChartedSize): FitSizeMatch => ({ sizeId, label });

const chooseBetweenTwo = (
  closer: ChartedSize,
  further: ChartedSize,
  closerScore: number,
  furtherScore: number,
  isStretchable: boolean | null,
): PreferredOfTwo => {
  const isNearTie = Math.abs(furtherScore - closerScore) < TIE_MARGIN;
  if (!isNearTie) return { preferred: closer, other: further, isDecidedByStretch: false };

  const [smaller, larger] =
    closer.chartIndex < further.chartIndex ? [closer, further] : [further, closer];
  const preferred = isStretchable === true ? smaller : larger;
  const other = preferred === smaller ? larger : smaller;
  return { preferred, other, isDecidedByStretch: true };
};

const recommendSingleFittingSize = (
  fittingSize: ChartedSize,
  chartedSizes: ChartedSize[],
  measurements: FitMeasurements,
  isStretchable: boolean | null,
): FitRecommendation => {
  const nextLargerSize = chartedSizes[fittingSize.chartIndex + NEXT_SIZE_STEP];
  const sizeUpSuggestion =
    isStretchable === false &&
    nextLargerSize !== undefined &&
    nextLargerSize.fitDistance <= NEAR_FIT_MAX &&
    isInUpperEdgeZone(fittingSize.fitRange, measurements)
      ? nextLargerSize
      : null;

  return {
    outcome: FIT_OUTCOME.SINGLE,
    primary: toSizeMatch(fittingSize),
    alternative: sizeUpSuggestion ? toSizeMatch(sizeUpSuggestion) : null,
    alternativeReason: sizeUpSuggestion ? FIT_ALTERNATIVE_REASON.SIZE_UP_FOR_ROOM : null,
    isDecidedByStretch: false,
  };
};

const recommendAmongFittingSizes = (
  fittingSizes: ChartedSize[],
  chartedSizes: ChartedSize[],
  measurements: FitMeasurements,
  isStretchable: boolean | null,
): FitRecommendation | null => {
  const [mostCentred, secondMostCentred] = fittingSizes
    .map((size) => ({
      size,
      centreDistance: measureDistanceFromCentre(size.fitRange, measurements),
    }))
    .sort((first, second) => first.centreDistance - second.centreDistance);

  if (!mostCentred) return null;
  if (!secondMostCentred) {
    return recommendSingleFittingSize(mostCentred.size, chartedSizes, measurements, isStretchable);
  }

  const { preferred, other, isDecidedByStretch } = chooseBetweenTwo(
    mostCentred.size,
    secondMostCentred.size,
    mostCentred.centreDistance,
    secondMostCentred.centreDistance,
    isStretchable,
  );

  return {
    outcome: FIT_OUTCOME.SINGLE,
    primary: toSizeMatch(preferred),
    alternative: toSizeMatch(other),
    alternativeReason: FIT_ALTERNATIVE_REASON.ALSO_FITS,
    isDecidedByStretch,
  };
};

const findCloserNeighbour = (
  nearestSize: ChartedSize,
  chartedSizes: ChartedSize[],
): ChartedSize | undefined => {
  const neighbours = [
    chartedSizes[nearestSize.chartIndex - NEXT_SIZE_STEP],
    chartedSizes[nearestSize.chartIndex + NEXT_SIZE_STEP],
  ].filter((neighbour): neighbour is ChartedSize => neighbour !== undefined);

  return neighbours.sort((first, second) => first.fitDistance - second.fitDistance)[0];
};

const recommendWithoutFittingSize = (
  chartedSizes: ChartedSize[],
  measurements: FitMeasurements,
  isStretchable: boolean | null,
): FitRecommendation => {
  const [nearestSize] = [...chartedSizes].sort(
    (first, second) => first.fitDistance - second.fitDistance,
  );
  if (!nearestSize) return { outcome: FIT_OUTCOME.NO_CHART };

  const closerNeighbour = findCloserNeighbour(nearestSize, chartedSizes);

  if (nearestSize.fitDistance > NEAR_FIT_MAX || !closerNeighbour) {
    const { minHeightCm, maxHeightCm, minWeightKg, maxWeightKg } = nearestSize.fitRange;
    const { heightCm, weightKg } = measurements;
    return {
      outcome: FIT_OUTCOME.NO_FIT,
      nearest: toSizeMatch(nearestSize),
      heightOffsetCm: offsetOutsideRange(heightCm, minHeightCm, maxHeightCm),
      weightOffsetKg: offsetOutsideRange(weightKg, minWeightKg, maxWeightKg),
    };
  }

  const { preferred, other, isDecidedByStretch } = chooseBetweenTwo(
    nearestSize,
    closerNeighbour,
    nearestSize.fitDistance,
    closerNeighbour.fitDistance,
    isStretchable,
  );

  return {
    outcome: FIT_OUTCOME.BETWEEN_SIZES,
    primary: toSizeMatch(preferred),
    alternative: toSizeMatch(other),
    isDecidedByStretch,
  };
};

export const recommendFitSize = (
  sizesInSizeOrder: FitSizeCandidate[],
  measurements: FitMeasurements,
  isStretchable: boolean | null,
): FitRecommendation => {
  const chartedSizes = sizesInSizeOrder
    .filter(
      (size): size is FitSizeCandidate & { fitRange: FitRange } =>
        size.fitRange !== null && isFitRangeOrdered(size.fitRange),
    )
    .map(({ sizeId, label, fitRange }, chartIndex) => ({
      sizeId,
      label,
      fitRange,
      chartIndex,
      fitDistance: measureFitDistance(fitRange, measurements),
    }));

  const fittingSizes = chartedSizes.filter((size) => size.fitDistance === PERFECT_FIT_DISTANCE);
  return (
    recommendAmongFittingSizes(fittingSizes, chartedSizes, measurements, isStretchable) ??
    recommendWithoutFittingSize(chartedSizes, measurements, isStretchable)
  );
};
