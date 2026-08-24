import { cva, type VariantProps } from "class-variance-authority";
import { Star } from "lucide-react";
import * as React from "react";

import { cn } from "./cn";

const RATING_MIN = 1;
const RATING_MAX = 5;
const RATING_VALUES = Array.from(
  { length: RATING_MAX - RATING_MIN + 1 },
  (_, index) => index + RATING_MIN,
);

const starVariants = cva("shrink-0", {
  variants: {
    size: {
      sm: "size-3.5",
      md: "size-4.5",
      lg: "size-6",
    },
  },
  defaultVariants: { size: "md" },
});

export interface RatingProps extends VariantProps<typeof starVariants> {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  label?: string;
  starQualityLabelByValue?: Record<number, string>;
  className?: string;
}

export const Rating = ({
  value,
  onChange,
  readOnly = false,
  label,
  starQualityLabelByValue,
  size,
  className,
}: RatingProps) => {
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);
  const displayValue = hoveredValue ?? value;
  const displayLabel = displayValue > 0 ? starQualityLabelByValue?.[displayValue] : undefined;

  if (readOnly || !onChange) {
    return (
      <div
        role="img"
        aria-label={label ?? `${value.toFixed(1)} out of ${RATING_MAX} stars`}
        className={cn("inline-flex items-center gap-0.5", className)}
      >
        {RATING_VALUES.map((star) => (
          <Star
            key={star}
            aria-hidden
            className={cn(
              starVariants({ size }),
              star <= Math.round(value) ? "fill-primary text-primary" : "fill-none text-border",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        role="radiogroup"
        aria-label={label ?? "Rating"}
        className="inline-flex items-center gap-0.5"
        onMouseLeave={() => setHoveredValue(null)}
      >
        {RATING_VALUES.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={
              starQualityLabelByValue
                ? `Rate ${star} out of ${RATING_MAX} stars: ${starQualityLabelByValue[star]}`
                : `Rate ${star} out of ${RATING_MAX} stars`
            }
            onMouseEnter={() => setHoveredValue(star)}
            onFocus={() => setHoveredValue(star)}
            onBlur={() => setHoveredValue(null)}
            onClick={() => onChange(star)}
            className="cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              aria-hidden
              className={cn(
                starVariants({ size }),
                star <= displayValue ? "fill-primary text-primary" : "fill-none text-border",
              )}
            />
          </button>
        ))}
      </div>

      {displayLabel && (
        <span aria-hidden className="text-sm font-medium text-primary-strong">
          {displayLabel}
        </span>
      )}
    </div>
  );
};
