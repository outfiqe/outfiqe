import {
  FIT_ALTERNATIVE_REASON,
  FIT_OUTCOME,
  type FitRecommendation,
  type FitSizeMatch,
} from "@outfiqe/utils";

export type FitRecommendationCopy = {
  headline: string;
  detail: string | null;
  primarySize: FitSizeMatch | null;
  alternativeSize: FitSizeMatch | null;
};

const NO_OFFSET = 0;

const describeStretchChoice = (
  primary: FitSizeMatch,
  isStretchable: boolean | null,
): string | null => {
  if (isStretchable === true) {
    return `This fabric stretches, so ${primary.label} is the better pick.`;
  }
  if (isStretchable === false) {
    return `This fabric doesn't stretch, so ${primary.label} is the safer pick.`;
  }
  return null;
};

const describeOffset = (
  offset: number,
  aboveWord: string,
  belowWord: string,
  unit: string,
): string | null => {
  if (offset === NO_OFFSET) return null;
  return `${Math.abs(offset)} ${unit} ${offset > NO_OFFSET ? aboveWord : belowWord}`;
};

export const describeFitRecommendation = (
  recommendation: FitRecommendation,
  isStretchable: boolean | null,
): FitRecommendationCopy | null => {
  switch (recommendation.outcome) {
    case FIT_OUTCOME.NO_CHART:
      return null;

    case FIT_OUTCOME.SINGLE: {
      const { primary, alternative, alternativeReason, isDecidedByStretch } = recommendation;
      const stretchChoice = isDecidedByStretch
        ? describeStretchChoice(primary, isStretchable)
        : null;
      const detail =
        alternative && alternativeReason === FIT_ALTERNATIVE_REASON.SIZE_UP_FOR_ROOM
          ? `You're near the top of ${primary.label} and this fabric doesn't stretch, so ${alternative.label} gives you more room.`
          : alternative
            ? [`${alternative.label} also fits.`, stretchChoice].filter(Boolean).join(" ")
            : `Cut for your height and weight.`;
      return {
        headline: `Your size: ${primary.label}`,
        detail,
        primarySize: primary,
        alternativeSize: alternative,
      };
    }

    case FIT_OUTCOME.BETWEEN_SIZES: {
      const { primary, alternative, isDecidedByStretch } = recommendation;
      const stretchChoice = isDecidedByStretch
        ? describeStretchChoice(primary, isStretchable)
        : null;
      return {
        headline: `You're between ${primary.label} and ${alternative.label}`,
        detail: stretchChoice ?? `${primary.label} is the closer fit.`,
        primarySize: primary,
        alternativeSize: alternative,
      };
    }

    case FIT_OUTCOME.NO_FIT: {
      const { nearest, heightOffsetCm, weightOffsetKg } = recommendation;
      const offsets = [
        describeOffset(heightOffsetCm, "taller", "shorter", "cm"),
        describeOffset(weightOffsetKg, "heavier", "lighter", "kg"),
      ].filter((offset): offset is string => offset !== null);
      return {
        headline: "No size here is cut for you",
        detail: `The nearest is ${nearest.label}: you're ${offsets.join(" and ")} than its range.`,
        primarySize: nearest,
        alternativeSize: null,
      };
    }
  }
};
