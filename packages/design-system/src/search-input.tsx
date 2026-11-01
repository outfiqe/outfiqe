"use client";

import { Search, X } from "lucide-react";

import { cn } from "./cn";
import { Input } from "./input";

type SearchInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  clearLabel?: string;
  className?: string;
};

export const SearchInput = ({
  value,
  onValueChange,
  placeholder,
  ariaLabel = placeholder,
  clearLabel = "Clear search",
  className,
}: SearchInputProps) => (
  <div className={cn("relative", className)}>
    <Search
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden
    />
    <Input
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="pl-9 pr-9"
    />
    {value && (
      <button
        type="button"
        onClick={() => onValueChange("")}
        aria-label={clearLabel}
        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    )}
  </div>
);
