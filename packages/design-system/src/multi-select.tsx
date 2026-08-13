"use client";

import { X } from "lucide-react";

import { cn } from "./cn";

type MultiSelectOption = { value: string; label: string };

type MultiSelectProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
};

export const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
}: MultiSelectProps) => {
  const selected = options.filter((option) => value.includes(option.value));
  const available = options.filter((option) => !value.includes(option.value));

  const add = (optionValue: string) => {
    if (!optionValue || value.includes(optionValue)) return;
    onChange([...value, optionValue]);
  };

  const remove = (optionValue: string) => onChange(value.filter((v) => v !== optionValue));

  return (
    <div className={cn("space-y-2", className)}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {option.label}
              <button
                type="button"
                onClick={() => remove(option.value)}
                aria-label={`Remove ${option.label}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <select
        value=""
        onChange={(event) => add(event.target.value)}
        disabled={available.length === 0}
        className={cn(
          "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors",
          "focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <option value="" disabled>
          {available.length === 0 ? "All selected" : placeholder}
        </option>
        {available.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
