import * as React from "react";

import { cn } from "./cn";
import { Input } from "./input";

export interface DateInputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "type"> {
  includesTime?: boolean;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ includesTime = false, className, onClick, ...props }, ref) => {
    const openCalendar = (event: React.MouseEvent<HTMLInputElement>) => {
      onClick?.(event);
      const input = event.currentTarget;
      if (!input.readOnly && "showPicker" in input) input.showPicker();
    };

    return (
      <Input
        ref={ref}
        type={includesTime ? "datetime-local" : "date"}
        onClick={openCalendar}
        className={cn(
          "cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          className,
        )}
        {...props}
      />
    );
  },
);
DateInput.displayName = "DateInput";
