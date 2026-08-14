import type { ReactNode } from "react";

import { cn } from "./cn";

export const FormBanner = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive",
        className,
      )}
    >
      {children}
    </div>
  );
};
