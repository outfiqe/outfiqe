"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "./cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface FilterMenuOption<OptionValue extends string> {
  value: OptionValue;
  label: string;
}

export interface FilterMenuProps<OptionValue extends string> {
  label: string;
  options: readonly FilterMenuOption<OptionValue>[];
  value: OptionValue;
  defaultValue: OptionValue;
  onChange: (value: OptionValue) => void;
  className?: string;
}

export const FilterMenu = <OptionValue extends string>({
  label,
  options,
  value,
  defaultValue,
  onChange,
  className,
}: FilterMenuProps<OptionValue>) => {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const selectedOption = options.find((option) => option.value === value);
  const isNarrowed = value !== defaultValue;

  const pickOption = (optionValue: OptionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        aria-controls={isOpen ? listId : undefined}
        className={cn(
          "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isNarrowed
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          className,
        )}
      >
        <span>
          {label}
          {isNarrowed && selectedOption && `: ${selectedOption.label}`}
        </span>
        <ChevronDown className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-56 overflow-y-auto p-1">
        <div id={listId} role="radiogroup" aria-label={label} className="flex flex-col">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => pickOption(option.value)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm",
                  "outline-none hover:bg-muted focus-visible:bg-muted",
                  isSelected ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {option.label}
                {isSelected && <Check className="size-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
