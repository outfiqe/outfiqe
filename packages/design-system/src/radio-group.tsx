"use client";

import { useId } from "react";

import { cn } from "./cn";

export type RadioOption<Value extends string> = {
  value: Value;
  label: React.ReactNode;
  description?: React.ReactNode;
  lang?: string;
};

export type RadioGroupProps<Value extends string> = {
  legend: string;
  isLegendVisible?: boolean;
  options: RadioOption<Value>[];
  value: Value | null;
  onChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
};

export const RadioGroup = <Value extends string>({
  legend,
  isLegendVisible = false,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: RadioGroupProps<Value>) => {
  const groupName = useId();

  return (
    <fieldset className={cn("space-y-2", className)} disabled={disabled}>
      <legend className={isLegendVisible ? "mb-2 text-sm font-medium text-foreground" : "sr-only"}>
        {legend}
      </legend>
      {options.map((option) => {
        const isChecked = value === option.value;
        return (
          <label
            key={option.value}
            lang={option.lang}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              isChecked ? "border-foreground" : "border-border hover:border-foreground/50",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={isChecked}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 accent-foreground"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              {option.description && (
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
};
