"use client";

import { Input } from "@outfiqe/design-system";
import { useId } from "react";

import type { FitRangeDraft } from "../schemas/sizeChart.schema";

type FitRangeInputsProps = {
  sizeLabel: string;
  value: FitRangeDraft;
  problem: string | null;
  onChange: (nextFitRange: FitRangeDraft) => void;
};

const FIT_RANGE_FIELDS: { key: keyof FitRangeDraft; label: string; placeholder: string }[] = [
  { key: "minHeightCm", label: "Shortest height (cm)", placeholder: "160" },
  { key: "maxHeightCm", label: "Tallest height (cm)", placeholder: "170" },
  { key: "minWeightKg", label: "Lightest weight (kg)", placeholder: "55" },
  { key: "maxWeightKg", label: "Heaviest weight (kg)", placeholder: "65" },
];

export const FitRangeInputs = ({ sizeLabel, value, problem, onChange }: FitRangeInputsProps) => {
  const problemId = useId();

  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FIT_RANGE_FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className="block text-xs text-muted-foreground">
            {label}
            <Input
              inputMode="numeric"
              aria-label={`${label} for size ${sizeLabel}`}
              aria-invalid={problem !== null}
              aria-describedby={problem ? problemId : undefined}
              placeholder={placeholder}
              className="mt-1 h-9"
              value={value[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
            />
          </label>
        ))}
      </div>
      {problem && (
        <p id={problemId} className="mt-1.5 text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
};
